import React, { useState } from "react";
import {
  Button,
  Form,
  Select,
  Input,
  Modal,
  Progress,
  Tag,
  Spin,
  Alert,
} from "antd";
import {
  UserAddOutlined,
  TrophyOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import Swal from "sweetalert2";
import axios from "../../apis/axiosInstance";

const { Option } = Select;

// ─── Role field config for ML prediction ──────────────────────────────────────
const ROLE_SKILL_FIELDS = {
  BA: [
    { name: "analytical_skills", label: "Analytical Skills" },
    { name: "technical_proficiency", label: "Technical Proficiency" },
    { name: "communication_skills", label: "Communication Skills" },
    { name: "problem_solving", label: "Problem Solving Skills" },
    {
      name: "leadership_experience",
      label: "Leadership / Team Lead Experience",
      isLeadership: true,
    },
    {
      name: "years_experience",
      label: "Years of Experience in Business Analysis",
      isExperience: true,
    },
  ],
  BE: [
    {
      name: "technical_proficiency",
      label: "Proficiency in Programming Languages / Frameworks / APIs",
    },
    {
      name: "analytical_skills",
      label: "Understanding of Microservices Architecture",
    },
    {
      name: "years_experience",
      label: "Years of Experience as Backend Engineer",
      isExperience: true,
    },
  ],
  DE: [
    {
      name: "technical_proficiency",
      label: "Scripting, CI/CD, Cloud Platforms & Config Management",
    },
    { name: "analytical_skills", label: "Monitoring & Logging Tools" },
    {
      name: "leadership_experience",
      label: "Leadership / Team Lead Experience",
      isLeadership: true,
    },
    {
      name: "years_experience",
      label: "Years of Experience as DevOps Engineer",
      isExperience: true,
    },
  ],
  FE: [
    {
      name: "technical_proficiency",
      label: "HTML/CSS, JavaScript/TypeScript & Frontend Frameworks",
    },
    { name: "analytical_skills", label: "UI/UX Design Principles" },
    {
      name: "years_experience",
      label: "Years of Experience as Frontend Engineer",
      isExperience: true,
    },
  ],
  FullE: [
    {
      name: "technical_proficiency",
      label: "Frontend & Backend Technologies, Frameworks, DB & APIs",
    },
    {
      name: "years_experience",
      label: "Years of Experience as FullStack Engineer",
      isExperience: true,
    },
  ],
  PM: [
    { name: "analytical_skills", label: "Planning, Scheduling & Budgeting" },
    {
      name: "leadership_experience",
      label: "Leadership & Team Management",
      isLeadership: true,
    },
    { name: "communication_skills", label: "Communication Skills" },
    { name: "problem_solving", label: "Risk Management" },
    { name: "technical_proficiency", label: "Knowledge of PM Methodologies" },
    {
      name: "years_experience",
      label: "Years of Experience as Project Manager",
      isExperience: true,
    },
  ],
  QA: [
    { name: "communication_skills", label: "Communication Skills" },
    { name: "technical_proficiency", label: "Test Automation & Bug Tracking" },
    { name: "analytical_skills", label: "Knowledge of Testing Methodologies" },
    {
      name: "leadership_experience",
      label: "Leadership / Team Lead Experience",
      isLeadership: true,
    },
    {
      name: "years_experience",
      label: "Years of Experience in QA",
      isExperience: true,
    },
  ],
  TL: [
    { name: "technical_proficiency", label: "Technical Expertise" },
    {
      name: "leadership_experience",
      label: "Leadership & Team Management",
      isLeadership: true,
    },
    { name: "analytical_skills", label: "Project Management Skills" },
    { name: "problem_solving", label: "Problem-Solving & Decision-Making" },
    { name: "communication_skills", label: "Communication & Collaboration" },
    {
      name: "years_experience",
      label: "Years of Experience as Tech Lead",
      isExperience: true,
    },
  ],
};

// Build single-domain object — backend now inserts only the selected domain row
const buildDomainExp = (selectedDomain, selectedYears) => ({
  Domain: selectedDomain,
  Years: selectedYears,
});

// ─── Map generic keys → exact insert_json field names per role ─────────────────
// Matches EXACTLY what the original individual role components sent to employee/insert
const ROLE_INSERT_FIELDS = {
  BA: (v) => ({
    "Analytical Skills": v.analytical_skills,
    "Technical Proficiency": v.technical_proficiency,
    "Communication Skills": v.communication_skills,
    "Problem Solving Skills": v.problem_solving,
    "Years of experience in Business Analysis": v.years_experience,
    "Experience of related Domain": buildDomainExp(
      v.domain,
      v.domain_experience
    ),
    "Leadership-Team lead experience": v.leadership_experience,
    "Bachelor's Degree": v.bachelors_degree,
    "Master's Degree": v.masters_degree,
  }),
  BE: (v) => ({
    "Proficiency in Programming Languages": v.technical_proficiency,
    "Database Management (SQL, NoSQL)": v.technical_proficiency,
    "API Development and Integration": v.technical_proficiency,
    "Knowledge of Frameworks": v.technical_proficiency,
    "Understanding of Microservices Architecture": v.analytical_skills,
    "Years of experience in Bacend Engineer": v.years_experience,
    "Experience of related Domain": buildDomainExp(
      v.domain,
      v.domain_experience
    ),
    "Bachelor's Degree": v.bachelors_degree,
    "Master's Degree": v.masters_degree,
  }),
  DE: (v) => ({
    "Scripting and Automation (Python, Bash)": v.technical_proficiency,
    "Continuous Integration/Continuous Deployment": v.technical_proficiency,
    "Cloud Platforms ( AWS, Azure, GCP)": v.technical_proficiency,
    "Configuration Management Tools": v.technical_proficiency,
    "Monitoring and Logging Tools": v.analytical_skills,
    "Years of experience in DevOps Engineer": v.years_experience,
    "Experience of related Domain": buildDomainExp(
      v.domain,
      v.domain_experience
    ),
    "Leadership/Team lead experience": v.leadership_experience,
    "Bachelor's Degree": v.bachelors_degree,
    "Master's Degree": v.masters_degree,
  }),
  FE: (v) => ({
    "Proficiency in HTML/CSS": v.technical_proficiency,
    "Proficiency in JavaScript/TypeScript": v.technical_proficiency,
    "Knowledge of Frontend Frameworks/Libraries": v.technical_proficiency,
    "UI/UX Design Principles": v.analytical_skills,
    "Responsive Design and Cross-Browser Compatibility":
      v.technical_proficiency,
    "Years of experience in FrontEnd engineer": v.years_experience,
    "Experience of related Domain": buildDomainExp(
      v.domain,
      v.domain_experience
    ),
    "Bachelor's Degree": v.bachelors_degree,
    "Master's Degree": v.masters_degree,
  }),
  FullE: (v) => ({
    "Proficiency in Frontend Technologies": v.technical_proficiency,
    "Proficiency in Backend Technologies ": v.technical_proficiency,
    "Knowledge of Frontend Frameworks": v.technical_proficiency,
    "Knowledge of Backend Frameworks": v.technical_proficiency,
    "Database Management (SQL, NoSQL)": v.technical_proficiency,
    "API Development and Integration": v.technical_proficiency,
    "Years of experience in Fullstack engineer": v.years_experience,
    "Experience of related Domain": buildDomainExp(
      v.domain,
      v.domain_experience
    ),
    "Bachelor's Degree": v.bachelors_degree,
    "Master's Degree": v.masters_degree,
  }),
  PM: (v) => ({
    "planning & scheduling": v.analytical_skills,
    "Leadership and Team Management": v.leadership_experience,
    "Communication Skills": v.communication_skills,
    "Risk Management": v.problem_solving,
    "Budgeting and Cost Control": v.analytical_skills,
    "Knowledge of Project Management Methodologies": v.technical_proficiency,
    "Years of experience in Fullstack engineer": v.years_experience,
    "Experience of related Domain": buildDomainExp(
      v.domain,
      v.domain_experience
    ),
    "Bachelor's Degree": v.bachelors_degree,
    "Master's Degree": v.masters_degree,
  }),
  QA: (v) => ({
    "Excellent communication ": v.communication_skills, // trailing space matches Excel column
    "Test Automation": v.technical_proficiency,
    "Knowledge of testing methodologies": v.analytical_skills,
    "Bug tracking and reporting": v.technical_proficiency,
    "Years of experience in QA": v.years_experience,
    "Experience of related Domain": buildDomainExp(
      v.domain,
      v.domain_experience
    ),
    "Leadership/Team lead experience": v.leadership_experience,
    "Bachelor's Degree": v.bachelors_degree,
    "Master's Degree": v.masters_degree,
  }),
  TL: (v) => ({
    "Technical Expertise": v.technical_proficiency,
    "Leadership and Team Management": v.leadership_experience,
    "Project Management Skills": v.analytical_skills,
    "Problem-Solving and Decision-Making": v.problem_solving,
    "Communication and Collaboration": v.communication_skills,
    "Years of experience in Tech Lead": v.years_experience,
    "Experience of related Domain": buildDomainExp(
      v.domain,
      v.domain_experience
    ),
    "Bachelor's Degree": v.bachelors_degree,
    "Master's Degree": v.masters_degree,
  }),
};

const ROLE_LABEL_MAP = {
  BA: "Business Analyst",
  QA: "Quality Assurance Engineer",
  DE: "DevOps Engineer",
  TL: "Tech Lead",
  BE: "Backend Engineer",
  FE: "Frontend Engineer",
  FullE: "FullStack Engineer",
  PM: "Project Manager",
};
const ROLE_API_MAP = { ...ROLE_LABEL_MAP };

const SKILL_OPTIONS = ["Novice", "Intermediate", "Advanced"];
const LEAD_OPTIONS = ["Non-Lead", "Leadership"];
const EXP_OPTIONS = ["1-2 years", "3-5 years", "5+ years"];
const DOM_EXP_OPTIONS = ["0 - 5", "6 - 14", "15+"];
const DEGREE_OPTIONS = ["Unrelated", "related"];
const DOMAIN_OPTIONS = ["Finance", "Health", "Education", "E-Commerce"];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getCategoryStyle = (cat) => {
  if (cat === "High")
    return {
      color: "#52c41a",
      bg: "#f6ffed",
      border: "#b7eb8f",
      icon: <CheckCircleOutlined />,
    };
  if (cat === "Medium")
    return {
      color: "#faad14",
      bg: "#fffbe6",
      border: "#ffe58f",
      icon: <WarningOutlined />,
    };
  return {
    color: "#ff4d4f",
    bg: "#fff2f0",
    border: "#ffccc7",
    icon: <CloseCircleOutlined />,
  };
};
const getProgressColor = (s) =>
  s >= 61 ? "#52c41a" : s >= 31 ? "#faad14" : "#ff4d4f";

// ─── Skill Select ─────────────────────────────────────────────────────────────
const SkillSelect = ({ label, name, isLeadership, isExperience }) => {
  const options = isLeadership
    ? LEAD_OPTIONS
    : isExperience
    ? EXP_OPTIONS
    : SKILL_OPTIONS;
  return (
    <Form.Item
      name={name}
      label={label}
      rules={[{ required: true, message: `Please select ${label}` }]}
      style={{ width: "48%" }}
    >
      <Select placeholder="-- Select --" allowClear>
        {options.map((o) => (
          <Option key={o} value={o}>
            {o}
          </Option>
        ))}
      </Select>
    </Form.Item>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, subtitle, children, tinted }) => (
  <div
    style={{
      background: tinted ? "#f8faff" : "#fff",
      border: `1px solid ${tinted ? "#d0e4f7" : "#e8e8e8"}`,
      borderRadius: 10,
      padding: "20px 24px",
      marginBottom: 20,
    }}
  >
    <div
      style={{
        fontWeight: 600,
        color: "#1F4E79",
        marginBottom: subtitle ? 4 : 16,
        fontSize: 15,
      }}
    >
      {title}
    </div>
    {subtitle && (
      <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
        {subtitle}
      </div>
    )}
    <div style={{ display: "flex", gap: "4%", flexWrap: "wrap" }}>
      {children}
    </div>
  </div>
);

// ─── Career Advice Modal ──────────────────────────────────────────────────────
// ─── KPI score map (matches JSON config values) ───────────────────────────────
const LEVEL_SCORE = {
  Novice: 20,
  Intermediate: 50,
  Advanced: 100,
  "Non-Lead": 0,
  Leadership: 100,
  "1-2 years": 20,
  "3-5 years": 50,
  "5+ years": 100,
  "0 - 5": 20,
  "6 - 14": 50,
  "15+": 100,
  Unrelated: 50,
  related: 100,
};

const LEVEL_NEXT = {
  Novice: "Intermediate",
  Intermediate: "Advanced",
  "Non-Lead": "Leadership",
  "1-2 years": "3-5 years",
  "3-5 years": "5+ years",
  "0 - 5": "6 - 14",
  "6 - 14": "15+",
  Unrelated: "related",
};

const buildGapAnalysis = (employeeData) => {
  const fields = [
    { key: "technical_proficiency", label: "Technical Proficiency" },
    { key: "analytical_skills", label: "Analytical Skills" },
    { key: "communication_skills", label: "Communication Skills" },
    { key: "problem_solving", label: "Problem Solving" },
    { key: "leadership_experience", label: "Leadership Experience" },
    { key: "years_experience", label: "Years of Experience" },
    { key: "domain_experience", label: "Domain Experience" },
    { key: "bachelors_degree", label: "Bachelor's Degree" },
    { key: "masters_degree", label: "Master's Degree" },
  ];
  return fields
    .map((f) => {
      const current = employeeData[f.key];
      const score = LEVEL_SCORE[current] ?? null;
      const nextLvl = LEVEL_NEXT[current];
      const nextScore = LEVEL_SCORE[nextLvl] ?? null;
      const gain = score !== null && nextScore !== null ? nextScore - score : 0;
      return { ...f, current, score, nextLvl, gain };
    })
    .filter((f) => f.gain > 0)
    .sort((a, b) => b.gain - a.gain);
};

const CareerAdviceModal = ({
  open,
  onClose,
  employeeData,
  kpiScore,
  category,
}) => {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);

  const gaps = buildGapAnalysis(employeeData);

  const fetchAdvice = async () => {
    setLoading(true);
    setAdvice(null);
    try {
      // Call Flask backend /ml/career_advice (uses GPT-4o + ML gap analysis server-side)
      const res = await axios.post("ml/career_advice", {
        employee_data: {
          role: employeeData.roleLabel,
          domain: employeeData.domain,
          analytical_skills: employeeData.analytical_skills,
          technical_proficiency: employeeData.technical_proficiency,
          communication_skills: employeeData.communication_skills,
          problem_solving: employeeData.problem_solving,
          years_experience: employeeData.years_experience,
          domain_experience: employeeData.domain_experience,
          leadership_experience: employeeData.leadership_experience,
          bachelors_degree: employeeData.bachelors_degree,
          masters_degree: employeeData.masters_degree,
        },
        kpi_score: kpiScore,
        category: category,
      });
      if (res.data.status === "success") {
        setAdvice(res.data.advice);
      } else {
        setAdvice({ error: true });
      }
    } catch {
      setAdvice({ error: true });
    }
    setLoading(false);
  };

  const priorityColor = (i) =>
    i === 0 ? "#ff4d4f" : i === 1 ? "#faad14" : "#2E75B6";
  const priorityLabel = (i) =>
    i === 0
      ? "Highest Priority"
      : i === 1
      ? "High Priority"
      : "Medium Priority";

  return (
    <Modal
      title={
        <span style={{ color: "#1F4E79", fontWeight: 700, fontSize: 16 }}>
          <BulbOutlined style={{ marginRight: 8, color: "#faad14" }} />
          KPI Improvement Plan — {employeeData.roleLabel}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="r" onClick={fetchAdvice} loading={loading}>
          Regenerate
        </Button>,
        <Button key="c" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={680}
      afterOpenChange={(v) => v && !advice && fetchAdvice()}
    >
      {/* Current KPI bar */}
      <div
        style={{
          background: "#f8faff",
          border: "1px solid #d0e4f7",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#888" }}>Current KPI</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: category === "Low" ? "#ff4d4f" : "#faad14",
            }}
          >
            {kpiScore}
            <span style={{ fontSize: 13, fontWeight: 400, color: "#aaa" }}>
              /100
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <Progress
            percent={kpiScore}
            strokeColor={category === "Low" ? "#ff4d4f" : "#faad14"}
            trailColor="#f0f0f0"
            strokeWidth={10}
            showInfo={false}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#aaa",
              marginTop: 2,
            }}
          >
            <span>0</span>
            <span style={{ color: "#faad14" }}>30 (Medium)</span>
            <span style={{ color: "#52c41a" }}>60 (High) ← target</span>
            <span>100</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#888" }}>Target</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#52c41a" }}>
            61+
          </div>
        </div>
      </div>

      {/* Gap chips */}
      {gaps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
            Areas with improvement potential (sorted by KPI impact):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {gaps.map((g, i) => (
              <Tag
                key={g.key}
                color={i < 3 ? "red" : "default"}
                style={{ fontSize: 11, padding: "2px 8px" }}
              >
                {g.label}: {g.current} → {g.nextLvl} (+{g.gain} pts)
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
          <div style={{ marginTop: 12, color: "#888" }}>
            Analysing KPI gaps and building your improvement plan...
          </div>
        </div>
      )}

      {/* Error */}
      {advice?.error && !loading && (
        <Alert
          type="error"
          message="Failed to generate advice. Please click Regenerate."
          showIcon
        />
      )}

      {/* Advice cards */}
      {advice && !advice.error && !loading && (
        <div>
          <div
            style={{
              background: "#fffbe6",
              border: "1px solid #ffe58f",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 13,
              color: "#7c5800",
            }}
          >
            💡 {advice.summary}
          </div>
          {advice.focus_areas?.map((area, i) => (
            <div
              key={i}
              style={{
                border: `1.5px solid ${priorityColor(i)}33`,
                borderLeft: `4px solid ${priorityColor(i)}`,
                borderRadius: 8,
                padding: "14px 16px",
                marginBottom: 12,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div>
                  <span
                    style={{ fontWeight: 700, fontSize: 14, color: "#1F4E79" }}
                  >
                    {area.area}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: "#888" }}>
                    {area.current_level} → {area.target_level}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Tag color="green" style={{ fontSize: 11 }}>
                    +{area.kpi_gain} KPI pts
                  </Tag>
                  <Tag
                    color={i === 0 ? "red" : i === 1 ? "orange" : "blue"}
                    style={{ fontSize: 11 }}
                  >
                    {priorityLabel(i)}
                  </Tag>
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#666",
                  marginBottom: 10,
                  fontStyle: "italic",
                }}
              >
                {area.why_it_matters}
              </div>
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#1F4E79",
                    marginBottom: 4,
                  }}
                >
                  Action Steps:
                </div>
                {area.actions?.map((action, j) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      gap: 8,
                      fontSize: 13,
                      color: "#333",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        color: priorityColor(i),
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {j + 1}.
                    </span>
                    {action}
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#888",
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: 8,
                }}
              >
                ⏱ Estimated timeline:{" "}
                <strong style={{ color: "#555" }}>{area.timeline}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const AddEmployee = () => {
  const [form] = Form.useForm();
  const [selectedRole, setSelectedRole] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [submittedValues, setSubmittedValues] = useState(null);
  const [error, setError] = useState(null);

  const handleRoleChange = (val) => {
    setSelectedRole(val);
    setPrediction(null);
    setError(null);
    setSubmittedValues(null);
    form.resetFields([
      "analytical_skills",
      "technical_proficiency",
      "communication_skills",
      "problem_solving",
      "leadership_experience",
      "years_experience",
    ]);
  };

  // ── Step 1: Predict KPI ───────────────────────────────────────────────────
  const handleFinish = async (values) => {
    setError(null);
    setPredicting(true);
    setPrediction(null);

    const mlPayload = {
      role: ROLE_API_MAP[values.role],
      domain: values.domain,
      analytical_skills: values.analytical_skills || "Intermediate",
      technical_proficiency: values.technical_proficiency || "Intermediate",
      communication_skills: values.communication_skills || "Intermediate",
      problem_solving: values.problem_solving || "Intermediate",
      domain_expertise: values.technical_proficiency || "Intermediate",
      years_experience: values.years_experience || "1-2 years",
      domain_experience: values.domain_experience,
      leadership_experience: values.leadership_experience || "Non-Lead",
      bachelors_degree: values.bachelors_degree || "Unrelated",
      masters_degree: values.masters_degree || "Unrelated",
    };

    try {
      const res = await axios.post("ml/predict_kpi", mlPayload);
      const data = res.data.prediction ?? res.data;
      setPrediction(data);
      setSubmittedValues(values);
    } catch (err) {
      setError(
        `KPI prediction failed: ${err.message}. Please check the backend is running.`
      );
    }
    setPredicting(false);
  };

  // ── Step 2: Save employee after confirming KPI ────────────────────────────
  const handleSave = async () => {
    if (!submittedValues || !selectedRole) return;
    setSaving(true);

    const v = submittedValues;
    const insertFn = ROLE_INSERT_FIELDS[selectedRole];
    const insert_json = {
      Name: v.name,
      Age: v.age,
      "Home Town": v.home,
      "Phone Number": v.phone,
      ...insertFn(v),
    };

    try {
      const res = await axios.post("employee/insert", {
        role: ROLE_API_MAP[selectedRole],
        insert_json,
      });
      Swal.fire(res.data.response || "Employee Saved!", "", "success");
      // Reset everything
      form.resetFields();
      setSelectedRole(null);
      setPrediction(null);
      setSubmittedValues(null);
    } catch (err) {
      Swal.fire(
        "Details Not Saved",
        err.message || "Please try again.",
        "error"
      );
    }
    setSaving(false);
  };

  const roleFields = selectedRole ? ROLE_SKILL_FIELDS[selectedRole] || [] : [];
  const catStyle = prediction
    ? getCategoryStyle(prediction.performance_category)
    : null;
  const needsAdvice =
    prediction &&
    (prediction.performance_category === "Medium" ||
      prediction.performance_category === "Low");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <UserAddOutlined style={{ fontSize: 28, color: "#2E75B6" }} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1F4E79" }}>
            Add Employee
          </div>
          <div style={{ fontSize: 13, color: "#888" }}>
            Fill in details → click Predict KPI → review score → Save Employee.
          </div>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        autoComplete="off"
        onValuesChange={() => {
          setPrediction(null);
          setError(null);
          setSubmittedValues(null);
        }}
      >
        {/* ── Personal Details ── */}
        <Section title="Personal Details" tinted>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter name" }]}
            style={{ width: "48%" }}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>
          <Form.Item
            name="age"
            label="Age"
            rules={[{ required: true, message: "Please enter age" }]}
            style={{ width: "48%" }}
          >
            <Input type="number" placeholder="e.g. 28" />
          </Form.Item>
          <Form.Item
            name="home"
            label="Home Town"
            rules={[{ required: true, message: "Please enter home town" }]}
            style={{ width: "48%" }}
          >
            <Input placeholder="e.g. Colombo" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[{ required: true, message: "Please enter phone number" }]}
            style={{ width: "48%" }}
          >
            <Input placeholder="e.g. 0771234567" />
          </Form.Item>
        </Section>

        {/* ── Role & Domain ── */}
        <Section title="Role & Domain">
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please select a role" }]}
            style={{ width: "48%" }}
          >
            <Select
              placeholder="-- Select a Role --"
              allowClear
              onChange={handleRoleChange}
            >
              <Option value="BA">Business Analyst</Option>
              <Option value="QA">Quality Assurance Engineer</Option>
              <Option value="DE">DevOps Engineer</Option>
              <Option value="TL">Tech Lead</Option>
              <Option value="BE">Backend Engineer</Option>
              <Option value="FE">Frontend Engineer</Option>
              <Option value="FullE">FullStack Engineer</Option>
              <Option value="PM">Project Manager</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="domain"
            label="Domain"
            rules={[{ required: true, message: "Please select a domain" }]}
            style={{ width: "48%" }}
          >
            <Select placeholder="-- Select Domain --" allowClear>
              {DOMAIN_OPTIONS.map((d) => (
                <Option key={d} value={d}>
                  {d}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="domain_experience"
            label="Years of Experience in This Domain"
            rules={[
              { required: true, message: "Please select domain experience" },
            ]}
            style={{ width: "48%" }}
          >
            <Select placeholder="-- Select --" allowClear>
              {DOM_EXP_OPTIONS.map((o) => (
                <Option key={o} value={o}>
                  {o} years
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Section>

        {/* ── Role Skills ── */}
        {selectedRole && (
          <Section
            title={
              <>
                Role-Specific Skills{" "}
                <Tag
                  color="blue"
                  style={{ marginLeft: 8, fontWeight: 400, fontSize: 12 }}
                >
                  {ROLE_LABEL_MAP[selectedRole]}
                </Tag>
              </>
            }
            subtitle="Used by the ML model to predict KPI score."
          >
            {roleFields.map((f) => (
              <SkillSelect key={f.name} {...f} />
            ))}
          </Section>
        )}

        {/* ── Education ── */}
        {selectedRole && (
          <Section title="Education">
            <Form.Item
              name="bachelors_degree"
              label="Bachelor's Degree"
              rules={[{ required: true, message: "Please select" }]}
              style={{ width: "48%" }}
            >
              <Select placeholder="-- Select --" allowClear>
                {DEGREE_OPTIONS.map((o) => (
                  <Option key={o} value={o}>
                    {o === "related" ? "Yes (Related)" : "No (Unrelated)"}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="masters_degree"
              label="Master's Degree"
              rules={[{ required: true, message: "Please select" }]}
              style={{ width: "48%" }}
            >
              <Select placeholder="-- Select --" allowClear>
                {DEGREE_OPTIONS.map((o) => (
                  <Option key={o} value={o}>
                    {o === "related" ? "Yes (Related)" : "No (Unrelated)"}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Section>
        )}

        {/* ── Error ── */}
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* ── Predict button ── */}
        {selectedRole && (
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={predicting}
              size="large"
              icon={<TrophyOutlined />}
              style={{
                background: "#1F4E79",
                borderColor: "#1F4E79",
                minWidth: 200,
              }}
            >
              {predicting ? "Predicting KPI..." : "Predict KPI Score"}
            </Button>
          </Form.Item>
        )}
      </Form>

      {/* ── KPI Result Card ── */}
      {prediction && submittedValues && (
        <div
          style={{
            marginTop: 8,
            background: "#fff",
            border: `2px solid ${catStyle.border}`,
            borderRadius: 12,
            padding: "24px 28px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TrophyOutlined style={{ fontSize: 24, color: catStyle.color }} />
              <div>
                <div
                  style={{ fontSize: 16, fontWeight: 700, color: "#1F4E79" }}
                >
                  KPI Prediction Result
                </div>
                <div style={{ fontSize: 13, color: "#888" }}>
                  {submittedValues.name} · {ROLE_LABEL_MAP[selectedRole]}
                </div>
              </div>
            </div>
            <Tag
              icon={catStyle.icon}
              color={
                prediction.performance_category === "High"
                  ? "success"
                  : prediction.performance_category === "Medium"
                  ? "warning"
                  : "error"
              }
              style={{ fontSize: 14, padding: "4px 14px", borderRadius: 20 }}
            >
              {prediction.performance_category} Performance
            </Tag>
          </div>

          {/* Score bar */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontWeight: 600, color: "#555" }}>
                Predicted KPI Score
              </span>
              <span
                style={{ fontWeight: 800, fontSize: 22, color: catStyle.color }}
              >
                {prediction.predicted_kpi_score}
                <span style={{ fontSize: 14, fontWeight: 400, color: "#aaa" }}>
                  {" "}
                  / 100
                </span>
              </span>
            </div>
            <Progress
              percent={prediction.predicted_kpi_score}
              strokeColor={getProgressColor(prediction.predicted_kpi_score)}
              trailColor="#f0f0f0"
              strokeWidth={12}
              showInfo={false}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                fontSize: 12,
                color: "#aaa",
              }}
            >
              <span>
                Confidence: {prediction.confidence_lower?.toFixed(1)} –{" "}
                {prediction.confidence_upper?.toFixed(1)}
              </span>
              <span style={{ color: catStyle.color, fontWeight: 600 }}>
                {prediction.performance_category === "High"
                  ? "✅ Strong performer"
                  : prediction.performance_category === "Medium"
                  ? "⚠ Needs improvement"
                  : "❌ Requires intervention"}
              </span>
            </div>
          </div>

          {/* Contributing factors */}
          {prediction.top_contributing_factors?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: "#555",
                  marginBottom: 8,
                  fontSize: 13,
                }}
              >
                Top Contributing Factors
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {prediction.top_contributing_factors.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#f8faff",
                      border: "1px solid #d0e4f7",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "#2E75B6", fontWeight: 600 }}>
                      {f.feature}
                    </span>
                    {f.value && f.value !== "N/A" && (
                      <span style={{ color: "#888", marginLeft: 6 }}>
                        → {f.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Career advice — Low / Medium only */}
          {needsAdvice && (
            <div
              style={{
                background:
                  prediction.performance_category === "Medium"
                    ? "#fffbe6"
                    : "#fff2f0",
                border: `1px solid ${catStyle.border}`,
                borderRadius: 8,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: catStyle.color,
                    fontSize: 14,
                  }}
                >
                  {prediction.performance_category === "Medium"
                    ? "This employee shows room for improvement."
                    : "This employee needs a development plan."}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  AI-powered career advice based on their role and skill gaps.
                </div>
              </div>
              <Button
                type="primary"
                danger={prediction.performance_category === "Low"}
                icon={<BulbOutlined />}
                onClick={() => setAdviceOpen(true)}
                style={{
                  whiteSpace: "nowrap",
                  minWidth: 220,
                  background:
                    prediction.performance_category === "Medium"
                      ? "#faad14"
                      : undefined,
                  borderColor:
                    prediction.performance_category === "Medium"
                      ? "#faad14"
                      : undefined,
                }}
              >
                Press here for career advice <ArrowRightOutlined />
              </Button>
            </div>
          )}

          {/* High performer */}
          {prediction.performance_category === "High" && (
            <div
              style={{
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: 8,
                padding: "12px 18px",
                color: "#389e0d",
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              <CheckCircleOutlined style={{ marginRight: 8 }} />
              This employee is a high performer. No intervention required.
            </div>
          )}

          {/* ── Save button ── */}
          <div
            style={{
              borderTop: "1px solid #f0f0f0",
              paddingTop: 20,
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 13, color: "#888" }}>
              Reviewed the KPI result? Click <strong>Save Employee</strong> to
              add them to the database.
            </div>
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              style={{
                background: "#389e0d",
                borderColor: "#389e0d",
                minWidth: 180,
              }}
            >
              {saving ? "Saving..." : "Save Employee"}
            </Button>
          </div>
        </div>
      )}

      {/* Career Advice Modal */}
      {adviceOpen && submittedValues && prediction && (
        <CareerAdviceModal
          open={adviceOpen}
          onClose={() => setAdviceOpen(false)}
          employeeData={{
            ...submittedValues,
            roleLabel: ROLE_LABEL_MAP[selectedRole],
          }}
          kpiScore={prediction.predicted_kpi_score}
          category={prediction.performance_category}
        />
      )}
    </div>
  );
};

export default AddEmployee;
