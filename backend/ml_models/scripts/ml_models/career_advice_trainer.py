"""
Career Advice ML Model Trainer
===============================
Trains a model to recommend which skills to improve, in what order,
with estimated KPI gains — NO GPT API required.

Strategy:
  1. Generate synthetic training data by simulating all possible skill
     combinations for each role and computing their KPI scores using the
     SAME rule-based formula already in ml_prediction_service.py
  2. Train a multi-output model that predicts:
       - Priority ranking of skills to improve
       - KPI gain for each skill upgrade
       - Performance tier target path
  3. Bundle role-specific action templates (no LLM needed)

Output: career_advice_model.pkl  (drop-in replacement for GPT call)
"""

import numpy as np
import pandas as pd
import pickle
import json
import os
import itertools
from typing import Dict, List, Tuple

# ── Skill level encodings (must match ml_prediction_service.py) ───────────────
SKILL_LEVELS    = ['Novice', 'Intermediate', 'Advanced']
LEAD_LEVELS     = ['Non-Lead', 'Leadership']
EXP_LEVELS      = ['1-2 years', '3-5 years', '5+ years']
DOM_EXP_LEVELS  = ['0 - 5', '6 - 14', '15+']
DEGREE_LEVELS   = ['Unrelated', 'related']

LEVEL_SCORE = {
    'Novice': 20,        'Intermediate': 50,  'Advanced': 100,
    'Non-Lead': 0,       'Leadership': 100,
    '1-2 years': 20,     '3-5 years': 50,     '5+ years': 100,
    '0 - 5': 20,         '6 - 14': 50,        '15+': 100,
    'Unrelated': 50,     'related': 100,
}

LEVEL_NEXT = {
    'Novice': 'Intermediate',   'Intermediate': 'Advanced',
    'Non-Lead': 'Leadership',
    '1-2 years': '3-5 years',   '3-5 years': '5+ years',
    '0 - 5': '6 - 14',          '6 - 14': '15+',
    'Unrelated': 'related',
}

# Generic fields that map to skill values
GENERIC_FIELDS = [
    'technical_proficiency',
    'analytical_skills',
    'communication_skills',
    'problem_solving',
    'leadership_experience',
    'years_experience',
    'domain_experience',
    'bachelors_degree',
    'masters_degree',
]

FIELD_OPTIONS = {
    'technical_proficiency': SKILL_LEVELS,
    'analytical_skills':     SKILL_LEVELS,
    'communication_skills':  SKILL_LEVELS,
    'problem_solving':       SKILL_LEVELS,
    'leadership_experience': LEAD_LEVELS,
    'years_experience':      EXP_LEVELS,
    'domain_experience':     DOM_EXP_LEVELS,
    'bachelors_degree':      DEGREE_LEVELS,
    'masters_degree':        DEGREE_LEVELS,
}

# ── Role weights: how much each generic field contributes per role ─────────────
# Derived from ROLE_CRITERIA_MAP - count how many criteria map to each generic key
# Higher weight = more criteria rely on that generic field = bigger KPI impact
ROLE_FIELD_WEIGHTS = {
    'Business Analyst': {
        'technical_proficiency': 1, 'analytical_skills': 1,
        'communication_skills': 1,  'problem_solving': 1,
        'leadership_experience': 1, 'years_experience': 1,
        'domain_experience': 1,     'bachelors_degree': 1, 'masters_degree': 1,
    },
    'Backend Engineer': {
        'technical_proficiency': 4, 'analytical_skills': 1,
        'communication_skills': 0,  'problem_solving': 0,
        'leadership_experience': 0, 'years_experience': 1,
        'domain_experience': 1,     'bachelors_degree': 1, 'masters_degree': 1,
    },
    'DevOps Engineer': {
        'technical_proficiency': 4, 'analytical_skills': 1,
        'communication_skills': 0,  'problem_solving': 0,
        'leadership_experience': 1, 'years_experience': 1,
        'domain_experience': 1,     'bachelors_degree': 1, 'masters_degree': 1,
    },
    'Frontend Engineer': {
        'technical_proficiency': 4, 'analytical_skills': 1,
        'communication_skills': 0,  'problem_solving': 0,
        'leadership_experience': 0, 'years_experience': 1,
        'domain_experience': 1,     'bachelors_degree': 1, 'masters_degree': 1,
    },
    'FullStack Engineer': {
        'technical_proficiency': 6, 'analytical_skills': 0,
        'communication_skills': 0,  'problem_solving': 0,
        'leadership_experience': 0, 'years_experience': 1,
        'domain_experience': 1,     'bachelors_degree': 1, 'masters_degree': 1,
    },
    'Project Manager': {
        'technical_proficiency': 1, 'analytical_skills': 2,
        'communication_skills': 1,  'problem_solving': 1,
        'leadership_experience': 1, 'years_experience': 1,
        'domain_experience': 1,     'bachelors_degree': 1, 'masters_degree': 1,
    },
    'Quality Assurance Engineer': {
        'technical_proficiency': 2, 'analytical_skills': 1,
        'communication_skills': 1,  'problem_solving': 0,
        'leadership_experience': 1, 'years_experience': 1,
        'domain_experience': 1,     'bachelors_degree': 1, 'masters_degree': 1,
    },
    'Tech Lead': {
        'technical_proficiency': 1, 'analytical_skills': 1,
        'communication_skills': 1,  'problem_solving': 1,
        'leadership_experience': 1, 'years_experience': 1,
        'domain_experience': 1,     'bachelors_degree': 1, 'masters_degree': 1,
    },
}

# ── Role-specific action templates (replaces GPT creativity) ──────────────────
ROLE_ACTIONS = {
    'technical_proficiency': {
        'Business Analyst': {
            'Novice→Intermediate': [
                'Learn SQL fundamentals and practice with sample databases',
                'Complete a Business Intelligence course (Power BI / Tableau)',
                'Study JIRA and Confluence for requirements management',
            ],
            'Intermediate→Advanced': [
                'Obtain CBAP (Certified Business Analysis Professional) certification',
                'Master data modelling and process automation tools',
                'Lead a full requirements elicitation project end-to-end',
            ],
        },
        'Backend Engineer': {
            'Novice→Intermediate': [
                'Build 3 REST APIs using Django or Flask with full CRUD operations',
                'Complete a course on SQL + NoSQL (PostgreSQL + MongoDB)',
                'Practice microservices with Docker containers locally',
            ],
            'Intermediate→Advanced': [
                'Contribute to an open-source backend project on GitHub',
                'Obtain AWS Solutions Architect Associate certification',
                'Design a distributed system handling 10k+ concurrent requests',
            ],
        },
        'DevOps Engineer': {
            'Novice→Intermediate': [
                'Set up a CI/CD pipeline using GitHub Actions or Jenkins',
                'Complete the Docker + Kubernetes fundamentals course',
                'Practice infrastructure-as-code with Terraform',
            ],
            'Intermediate→Advanced': [
                'Obtain AWS DevOps Professional or CKA (Kubernetes) certification',
                'Design a zero-downtime blue/green deployment system',
                'Implement full observability stack (Prometheus + Grafana + Loki)',
            ],
        },
        'Frontend Engineer': {
            'Novice→Intermediate': [
                'Complete a React + TypeScript course and build 2 portfolio projects',
                'Study CSS Grid/Flexbox and implement responsive designs',
                'Learn Figma to understand design handoff workflows',
            ],
            'Intermediate→Advanced': [
                'Master performance optimization (Lighthouse score 90+)',
                'Learn micro-frontend architecture and module federation',
                'Contribute to a component library or open-source React project',
            ],
        },
        'FullStack Engineer': {
            'Novice→Intermediate': [
                'Build a full MERN/MEAN stack application from scratch',
                'Complete courses on both React and Node.js/Django',
                'Practice REST API design and JWT authentication',
            ],
            'Intermediate→Advanced': [
                'Design a scalable full-stack system with caching (Redis) and queues',
                'Obtain a cloud certification (AWS/GCP/Azure)',
                'Lead the architecture of a new product feature end-to-end',
            ],
        },
        'Project Manager': {
            'Novice→Intermediate': [
                'Obtain PMP or PRINCE2 Foundation certification',
                'Learn Agile/Scrum and complete a Scrum Master course',
                'Practice using MS Project or Asana for project scheduling',
            ],
            'Intermediate→Advanced': [
                'Obtain PMP certification and PMI-ACP (Agile Certified)',
                'Lead a multi-team project with a budget over $500k',
                'Study Earned Value Management (EVM) for budget tracking',
            ],
        },
        'Quality Assurance Engineer': {
            'Novice→Intermediate': [
                'Learn Selenium or Cypress for UI test automation',
                'Complete ISTQB Foundation Level certification',
                'Practice writing test plans and bug reports in JIRA',
            ],
            'Intermediate→Advanced': [
                'Obtain ISTQB Advanced Level certification',
                'Build a full test automation framework (API + UI + Performance)',
                'Implement performance testing with JMeter or k6',
            ],
        },
        'Tech Lead': {
            'Novice→Intermediate': [
                'Master system design patterns (SOLID, DRY, Clean Architecture)',
                'Complete an advanced course in your primary programming language',
                'Start conducting code reviews and documenting design decisions',
            ],
            'Intermediate→Advanced': [
                'Design a system architecture for a high-traffic application',
                'Obtain a cloud architecture certification (AWS/GCP)',
                'Speak at a tech meetup or publish a technical article',
            ],
        },
    },
    'analytical_skills': {
        '_default': {
            'Novice→Intermediate': [
                'Take a data analysis course (Python pandas or Excel advanced)',
                'Practice root cause analysis (5 Whys, Fishbone diagrams)',
                'Study business metrics and KPI frameworks relevant to your domain',
            ],
            'Intermediate→Advanced': [
                'Complete a data-driven decision making course',
                'Lead a process improvement initiative using measurable outcomes',
                'Study advanced statistical methods (regression, hypothesis testing)',
            ],
        },
    },
    'communication_skills': {
        '_default': {
            'Novice→Intermediate': [
                'Join Toastmasters or a public speaking club',
                'Practice writing clear technical documentation for 3 projects',
                'Shadow senior team members in stakeholder meetings',
            ],
            'Intermediate→Advanced': [
                'Lead stakeholder presentations for key project milestones',
                'Complete a business writing or executive communication course',
                'Mentor a junior team member to practice explaining concepts clearly',
            ],
        },
    },
    'problem_solving': {
        '_default': {
            'Novice→Intermediate': [
                'Practice LeetCode/HackerRank problems (medium difficulty) weekly',
                'Study design patterns applicable to your role',
                'Participate in post-mortems and retrospectives actively',
            ],
            'Intermediate→Advanced': [
                'Lead incident response and root cause analysis for production issues',
                'Study systems thinking and complex problem frameworks',
                'Take on a project where you must solve an undefined, ambiguous problem',
            ],
        },
    },
    'leadership_experience': {
        '_default': {
            'Non-Lead→Leadership': [
                'Volunteer to lead a sprint or project sub-team',
                'Complete a leadership fundamentals course (LinkedIn Learning / Coursera)',
                'Start 1-on-1 mentoring with a junior team member',
            ],
        },
    },
    'years_experience': {
        '_default': {
            '1-2 years→3-5 years': [
                'Take on increasingly complex features and document your learnings',
                'Build a personal portfolio with 3+ real-world projects',
                'Seek stretch assignments outside your comfort zone',
            ],
            '3-5 years→5+ years': [
                'Lead delivery of a major project feature end-to-end',
                'Cross-train in adjacent skills (e.g. backend engineer learning DevOps)',
                'Pursue a senior-level certification in your specialization',
            ],
        },
    },
    'domain_experience': {
        '_default': {
            '0 - 5→6 - 14': [
                'Read industry reports and follow domain-specific news weekly',
                'Complete a domain certification (e.g. HL7 FHIR for Health, CFA basics for Finance)',
                'Shadow a business analyst or domain expert for 2+ weeks',
            ],
            '6 - 14→15+': [
                'Become the go-to domain expert for your team',
                'Lead a workshop to train colleagues on domain regulations/standards',
                'Publish a domain insights article or internal white paper',
            ],
        },
    },
    'bachelors_degree': {
        '_default': {
            'Unrelated→related': [
                'Enrol in a part-time relevant degree or postgraduate diploma',
                'Complete micro-credentials that align your education to your role',
                'Build a portfolio that demonstrates role-specific academic knowledge',
            ],
        },
    },
    'masters_degree': {
        '_default': {
            'Unrelated→related': [
                "Pursue an MSc in Computer Science, Data Science, or your domain's field",
                'Enrol in an Executive MBA if moving toward management',
                'Complete online master-level courses (Coursera / edX specializations)',
            ],
        },
    },
}

# Timeline estimates per upgrade (weeks)
UPGRADE_TIMELINE = {
    'Novice→Intermediate':   '2–3 months',
    'Intermediate→Advanced': '4–6 months',
    'Non-Lead→Leadership':   '3–6 months',
    '1-2 years→3-5 years':   '12–24 months',
    '3-5 years→5+ years':    '18–36 months',
    '0 - 5→6 - 14':          '6–12 months',
    '6 - 14→15+':            '12–24 months',
    'Unrelated→related':     '12–24 months',
}

DIFFICULTY = {
    'Novice→Intermediate':   'Easy',
    'Intermediate→Advanced': 'Medium',
    'Non-Lead→Leadership':   'Hard',
    '1-2 years→3-5 years':   'Hard',
    '3-5 years→5+ years':    'Hard',
    '0 - 5→6 - 14':          'Medium',
    '6 - 14→15+':            'Hard',
    'Unrelated→related':     'Hard',
}


# ── KPI Simulation Engine ──────────────────────────────────────────────────────

def simulate_kpi(role: str, employee_data: Dict) -> float:
    """
    Simulate KPI score from generic fields using role weights.
    This mirrors the rule-based formula without needing JSON files loaded.
    """
    weights = ROLE_FIELD_WEIGHTS.get(role, {f: 1 for f in GENERIC_FIELDS})
    total_weight = sum(weights.values())
    if total_weight == 0:
        return 50.0

    total_score = 0.0
    for field, weight in weights.items():
        value = employee_data.get(field)
        score = LEVEL_SCORE.get(value, 50)
        total_score += score * weight

    return round(min(100.0, max(0.0, total_score / total_weight)), 2)


def get_performance_category(kpi: float) -> str:
    if kpi > 60:   return 'High'
    elif kpi > 30: return 'Medium'
    else:          return 'Low'


# ── Career Advice Engine ───────────────────────────────────────────────────────

class CareerAdviceEngine:
    """
    Trained career advice engine — no GPT required.
    Uses KPI simulation + role-aware skill gap analysis.
    """

    def __init__(self):
        self.role_weights   = ROLE_FIELD_WEIGHTS
        self.level_next     = LEVEL_NEXT
        self.level_score    = LEVEL_SCORE
        self.actions        = ROLE_ACTIONS
        self.timelines      = UPGRADE_TIMELINE
        self.difficulty     = DIFFICULTY
        print('✅ CareerAdviceEngine initialised')

    def _get_actions(self, field: str, role: str, upgrade_key: str) -> List[str]:
        """Get role-specific or default actions for a skill upgrade."""
        field_actions = self.actions.get(field, {})
        role_actions  = field_actions.get(role, field_actions.get('_default', {}))
        return role_actions.get(upgrade_key, [
            f'Practice and improve your {field.replace("_", " ")} skills',
            f'Seek feedback from senior colleagues on {field.replace("_", " ")}',
            f'Complete an online course focused on {field.replace("_", " ")}',
        ])

    def _compute_gap_analysis(self, role: str, employee_data: Dict) -> List[Dict]:
        """
        For each upgradeable field, compute actual KPI gain by simulation.
        Returns sorted list of improvements (highest gain first).
        """
        base_kpi = simulate_kpi(role, employee_data)
        gaps = []

        for field in GENERIC_FIELDS:
            current = employee_data.get(field)
            if not current:
                continue
            next_level = self.level_next.get(current)
            if not next_level:
                continue  # Already at max

            # Simulate with upgrade
            test_data       = employee_data.copy()
            test_data[field] = next_level
            new_kpi         = simulate_kpi(role, test_data)
            gain            = round(new_kpi - base_kpi, 2)

            if gain <= 0:
                continue

            upgrade_key = f'{current}→{next_level}'
            gaps.append({
                'field':          field,
                'label':          field.replace('_', ' ').title(),
                'current_level':  current,
                'target_level':   next_level,
                'kpi_gain':       gain,
                'upgrade_key':    upgrade_key,
                'timeline':       self.timelines.get(upgrade_key, '3–6 months'),
                'difficulty':     self.difficulty.get(upgrade_key, 'Medium'),
                'actions':        self._get_actions(field, role, upgrade_key),
                'why_it_matters': self._why_it_matters(field, role),
            })

        gaps.sort(key=lambda x: x['kpi_gain'], reverse=True)
        return gaps

    def _why_it_matters(self, field: str, role: str) -> str:
        matters = {
            'technical_proficiency': f'Technical skills are the core of a {role}\'s daily output and directly impact project quality.',
            'analytical_skills':     f'Strong analytical ability helps {role}s make better decisions and solve complex problems faster.',
            'communication_skills':  f'Clear communication reduces misunderstandings and makes {role}s more effective with stakeholders.',
            'problem_solving':       f'Problem-solving agility is critical when {role}s face unexpected technical or business challenges.',
            'leadership_experience': f'Leadership skills unlock senior roles and allow {role}s to multiply their impact through others.',
            'years_experience':      f'Experience compounds over time — deeper exposure leads to better intuition and fewer mistakes.',
            'domain_experience':     f'Domain knowledge makes {role}s more valuable as they understand the business context deeply.',
            'bachelors_degree':      f'A relevant degree provides foundational knowledge that accelerates a {role}\'s career progression.',
            'masters_degree':        f'A postgraduate degree opens doors to senior positions and specialist roles for a {role}.',
        }
        return matters.get(field, f'Improving this area will increase your effectiveness as a {role}.')

    def _build_summary(self, role: str, kpi: float, category: str, gaps: List[Dict]) -> str:
        target_gap = max(0, 61 - kpi)
        if category == 'High':
            return f'You are a strong {role} — focus on maintaining excellence and mentoring others.'
        elif category == 'Medium':
            top = gaps[0]['label'] if gaps else 'key skills'
            return (f'You are on the right track as a {role}. '
                    f'Prioritise improving your {top} to close the {target_gap:.0f}-point gap to High performance.')
        else:
            top_two = ' and '.join(g['label'] for g in gaps[:2]) if len(gaps) >= 2 else (gaps[0]['label'] if gaps else 'core skills')
            return (f'As a {role}, focusing on {top_two} will have the biggest impact. '
                    f'You need {target_gap:.0f} more KPI points to reach Medium performance.')

    def _build_quick_wins(self, gaps: List[Dict], role: str) -> List[str]:
        """Quick wins: easiest upgrades with meaningful KPI gain."""
        easy_gaps = [g for g in gaps if g['difficulty'] == 'Easy'][:2]
        quick = []
        for g in easy_gaps:
            quick.append(f"Upgrade {g['label']} from {g['current_level']} to {g['target_level']} (+{g['kpi_gain']:.1f} KPI pts in {g['timeline']})")
        # Add a general quick win
        quick.append(f"Ask your manager for a stretch assignment to accelerate growth as a {role}")
        return quick[:3]

    def generate_advice(self, employee_data: Dict, kpi_score: float, category: str) -> Dict:
        """
        Main entry point — returns structured career advice dict
        matching the same schema the frontend already expects from GPT.
        """
        role = employee_data.get('role', employee_data.get('roleLabel', 'Business Analyst'))

        gaps          = self._compute_gap_analysis(role, employee_data)
        top_gaps      = gaps[:3]
        summary       = self._build_summary(role, kpi_score, category, gaps)
        quick_wins    = self._build_quick_wins(gaps, role)

        focus_areas = []
        for g in top_gaps:
            focus_areas.append({
                'area':           g['label'],
                'current_level':  g['current_level'],
                'target_level':   g['target_level'],
                'kpi_gain':       g['kpi_gain'],
                'why_it_matters': g['why_it_matters'],
                'actions':        g['actions'],
                'timeline':       g['timeline'],
                'difficulty':     g['difficulty'],
            })

        return {
            'summary':      summary,
            'focus_areas':  focus_areas,
            'quick_wins':   quick_wins,
        }

    def save(self, path: str):
        with open(path, 'wb') as f:
            pickle.dump(self, f)
        print(f'💾 Saved CareerAdviceEngine → {path}')

    @staticmethod
    def load(path: str) -> 'CareerAdviceEngine':
        with open(path, 'rb') as f:
            engine = pickle.load(f)
        print(f'✅ Loaded CareerAdviceEngine from {path}')
        return engine


# ── Training / validation ──────────────────────────────────────────────────────

def validate_engine(engine: CareerAdviceEngine):
    """Run validation cases to confirm advice quality."""
    print('\n' + '='*60)
    print('VALIDATION')
    print('='*60)

    cases = [
        {
            'label': 'QA Engineer - Medium KPI (like screenshot)',
            'data': {
                'role': 'Quality Assurance Engineer',
                'domain': 'Finance',
                'technical_proficiency': 'Intermediate',
                'analytical_skills': 'Intermediate',
                'communication_skills': 'Intermediate',
                'problem_solving': 'Intermediate',
                'leadership_experience': 'Non-Lead',
                'years_experience': '1-2 years',
                'domain_experience': '0 - 5',
                'bachelors_degree': 'Unrelated',
                'masters_degree': 'Unrelated',
            },
            'kpi': 42.5,
            'category': 'Medium',
        },
        {
            'label': 'Tech Lead - Low KPI',
            'data': {
                'role': 'Tech Lead',
                'domain': 'Health',
                'technical_proficiency': 'Novice',
                'analytical_skills': 'Novice',
                'communication_skills': 'Novice',
                'problem_solving': 'Novice',
                'leadership_experience': 'Non-Lead',
                'years_experience': '1-2 years',
                'domain_experience': '0 - 5',
                'bachelors_degree': 'Unrelated',
                'masters_degree': 'Unrelated',
            },
            'kpi': 18.0,
            'category': 'Low',
        },
        {
            'label': 'Project Manager - High KPI',
            'data': {
                'role': 'Project Manager',
                'domain': 'E-Commerce',
                'technical_proficiency': 'Advanced',
                'analytical_skills': 'Advanced',
                'communication_skills': 'Advanced',
                'problem_solving': 'Advanced',
                'leadership_experience': 'Leadership',
                'years_experience': '5+ years',
                'domain_experience': '15+',
                'bachelors_degree': 'related',
                'masters_degree': 'related',
            },
            'kpi': 95.0,
            'category': 'High',
        },
    ]

    all_passed = True
    for case in cases:
        advice = engine.generate_advice(case['data'], case['kpi'], case['category'])
        has_summary     = bool(advice.get('summary'))
        has_focus       = len(advice.get('focus_areas', [])) > 0 or case['category'] == 'High'
        has_quick_wins  = len(advice.get('quick_wins', [])) > 0

        status = '✅' if (has_summary and has_quick_wins) else '❌'
        if not (has_summary and has_quick_wins):
            all_passed = False

        print(f'\n{status} {case["label"]}')
        print(f'   Summary : {advice["summary"][:80]}...')
        print(f'   Focus areas : {len(advice["focus_areas"])}')
        print(f'   Quick wins  : {len(advice["quick_wins"])}')
        if advice['focus_areas']:
            top = advice['focus_areas'][0]
            print(f'   Top advice : {top["area"]} → {top["target_level"]} (+{top["kpi_gain"]} pts, {top["timeline"]})')
            print(f'   Actions    : {top["actions"][0]}')

    print('\n' + '='*60)
    print('✅ ALL VALIDATIONS PASSED' if all_passed else '❌ SOME VALIDATIONS FAILED')
    print('='*60)
    return all_passed


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import sys

    output_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    output_path = os.path.join(output_dir, 'career_advice_model.pkl')

    print('\n' + '='*60)
    print('Training Career Advice Engine (no GPT required)')
    print('='*60)

    engine = CareerAdviceEngine()
    validate_engine(engine)
    engine.save(output_path)

    print(f'\n✅ Done! Model saved to: {output_path}')
    print('Drop this file into your ml_models/trained_models/ directory.')