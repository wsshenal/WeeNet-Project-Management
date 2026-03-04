"""
Data Generator for KPI ML Model Training
Generates synthetic employee performance data
"""

import pandas as pd
import numpy as np
import os

class KPIDataGenerator:
    def __init__(self, output_dir='data/KPI/training/'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Define possible values based on your JSON files
        self.roles = [
            'Business Analyst',
            'Backend Engineer',
            'DevOps Engineer',
            'Frontend Engineer',
            'FullStack Engineer',
            'Project Manager',
            'Quality Assurance Engineer',
            'Tech Lead'
        ]
        
        self.domains = ['Finance', 'E-Commerce', 'Health', 'Education']
        self.skill_levels = ['Novice', 'Intermediate', 'Advanced']
        self.experience_levels = {
            'years': ['1-2 years', '3-5 years', '5+ years'],
            'domain': ['0 - 5', '6 - 14', '15+']
        }
        self.education_levels = ['Unrelated', 'related']
        self.leadership_levels = ['Non-Lead', 'Leadership']
        
    def generate_employee_record(self, emp_id):
        """Generate a single employee record"""
        role = np.random.choice(self.roles)
        domain = np.random.choice(self.domains)
        
        # Generate skills based on role
        skills = self._generate_skills(role)
        
        # Generate experience
        years_exp = np.random.choice(self.experience_levels['years'])
        domain_exp = np.random.choice(self.experience_levels['domain'])
        leadership = np.random.choice(self.leadership_levels)
        
        # Generate education
        bachelors = np.random.choice(self.education_levels)
        masters = np.random.choice(self.education_levels)
        
        # Calculate actual KPI based on realistic correlations
        actual_kpi = self._calculate_realistic_kpi(
            skills, years_exp, domain_exp, leadership, 
            bachelors, masters, role
        )
        
        # Generate correlated performance metrics
        performance_metrics = self._generate_performance_metrics(actual_kpi)
        
        record = {
            'emp_id': f'EMP{emp_id:04d}',
            'role': role,
            'domain': domain,
            **skills,
            'years_experience': years_exp,
            'domain_experience': domain_exp,
            'leadership_experience': leadership,
            'bachelors_degree': bachelors,
            'masters_degree': masters,
            'actual_kpi': round(actual_kpi, 2),
            **performance_metrics
        }
        
        return record
    
    def _generate_skills(self, role):
        """Generate skill levels for different roles"""
        skill_names = [
            'analytical_skills',
            'technical_proficiency',
            'communication_skills',
            'problem_solving',
            'domain_expertise'
        ]
        
        skills = {}
        
        # Technical roles get higher technical skills
        technical_roles = ['Backend Engineer', 'Frontend Engineer', 
                          'FullStack Engineer', 'DevOps Engineer', 'Tech Lead']
        
        for skill in skill_names:
            if skill == 'technical_proficiency' and role in technical_roles:
                # Higher chance of Advanced for technical roles
                probs = [0.1, 0.3, 0.6]  # Novice, Intermediate, Advanced
            elif skill == 'analytical_skills' and role == 'Business Analyst':
                probs = [0.1, 0.3, 0.6]
            elif skill == 'communication_skills' and role in ['Project Manager', 'Business Analyst']:
                probs = [0.1, 0.3, 0.6]
            else:
                probs = [0.2, 0.5, 0.3]  # Balanced distribution
            
            skills[skill] = np.random.choice(self.skill_levels, p=probs)
        
        return skills
    
    def _calculate_realistic_kpi(self, skills, years_exp, domain_exp, 
                                 leadership, bachelors, masters, role):
        """Calculate KPI with realistic correlations"""
        
        # Skill scores (weighted by importance)
        skill_weights = {
            'analytical_skills': 0.20,
            'technical_proficiency': 0.25,
            'communication_skills': 0.15,
            'problem_solving': 0.20,
            'domain_expertise': 0.20
        }
        
        skill_mapping = {'Novice': 30, 'Intermediate': 60, 'Advanced': 90}
        
        skill_score = sum(
            skill_mapping[skills[skill]] * weight 
            for skill, weight in skill_weights.items()
        )
        
        # Experience scores
        exp_mapping = {
            '1-2 years': 30, '3-5 years': 60, '5+ years': 90
        }
        domain_mapping = {
            '0 - 5': 30, '6 - 14': 60, '15+': 90
        }
        
        exp_score = exp_mapping[years_exp] * 0.25
        domain_score = domain_mapping[domain_exp] * 0.20
        
        # Leadership bonus
        leadership_score = 10 if leadership == 'Leadership' else 0
        
        # Education bonus
        edu_score = 0
        if bachelors == 'related':
            edu_score += 5
        if masters == 'related':
            edu_score += 5
        
        # Role-specific adjustments
        role_bonus = 0
        senior_roles = ['Tech Lead', 'Project Manager']
        if role in senior_roles:
            role_bonus = 5
        
        # Calculate base KPI
        base_kpi = skill_score + exp_score + domain_score + leadership_score + edu_score + role_bonus
        
        # Add realistic noise (performance variation)
        noise = np.random.normal(0, 5)
        
        # Cap between 0-100
        actual_kpi = min(100, max(0, base_kpi + noise))
        
        return actual_kpi
    
    def _generate_performance_metrics(self, actual_kpi):
        """Generate correlated performance metrics"""
        
        # These metrics are correlated with actual_kpi
        metrics = {
            'project_success_rate': min(100, max(0, actual_kpi + np.random.normal(0, 10))),
            'task_completion_rate': min(100, max(0, actual_kpi + np.random.normal(0, 8))),
            'code_quality_score': min(100, max(0, actual_kpi + np.random.normal(0, 12))),
            'client_satisfaction': min(5, max(1, (actual_kpi / 20) + np.random.normal(0, 0.3))),
            'delivery_timeliness': min(100, max(0, actual_kpi + np.random.normal(0, 15)))
        }
        
        return {k: round(v, 2) for k, v in metrics.items()}
    
    def generate_dataset(self, n_samples=500, seed=42):
        """Generate complete training dataset"""
        np.random.seed(seed)
        
        print(f"🔄 Generating {n_samples} employee records...")
        
        data = []
        for i in range(1, n_samples + 1):
            record = self.generate_employee_record(i)
            data.append(record)
            
            if i % 100 == 0:
                print(f"   Generated {i}/{n_samples} records...")
        
        df = pd.DataFrame(data)
        
        # Save to CSV
        output_path = os.path.join(self.output_dir, 'kpi_training_data.csv')
        df.to_csv(output_path, index=False)
        
        print(f"\n✅ Dataset generated successfully!")
        print(f"📁 Saved to: {output_path}")
        print(f"\n📊 Dataset Summary:")
        print(f"   Total Records: {len(df)}")
        print(f"   Features: {len(df.columns)}")
        print(f"   Roles: {df['role'].nunique()}")
        print(f"   Domains: {df['domain'].nunique()}")
        print(f"\n📈 KPI Statistics:")
        print(df['actual_kpi'].describe())
        
        return df

def main():
    """Main execution"""
    generator = KPIDataGenerator()
    df = generator.generate_dataset(n_samples=500)
    
    # Show sample records
    print(f"\n📋 Sample Records:")
    print(df.head(10))
    
    # Show distribution by role
    print(f"\n👥 Distribution by Role:")
    print(df['role'].value_counts())

if __name__ == "__main__":
    main()