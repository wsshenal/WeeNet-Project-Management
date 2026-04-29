import React, { useState, useRef } from "react";
import {
  Button,
  Table,
  Tag,
  Alert,
  Progress,
  Space,
  Spin,
  Tooltip,
  Badge,
  Modal,
  Divider,
  Checkbox,
  Typography,
  Select,
  Card,
} from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  FileExcelOutlined,
  LoadingOutlined,
  DeleteOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import axios from "../../apis/axiosInstance";
import Swal from "sweetalert2";

const { Text } = Typography;
const { Option } = Select;

// ─── Constants ──────────────────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: "BA",    label: "Business Analyst" },
  { value: "QA",    label: "Quality Assurance Engineer" },
  { value: "DE",    label: "DevOps Engineer" },
  { value: "TL",    label: "Tech Lead" },
  { value: "BE",    label: "Backend Engineer" },
  { value: "FE",    label: "Frontend Engineer" },
  { value: "FullE", label: "FullStack Engineer" },
  { value: "PM",    label: "Project Manager" },
];

const DOMAIN_OPTIONS = ["Finance", "Health", "Education", "E-Commerce"];

const ROLE_LABEL_TO_KEY = Object.fromEntries(
  ROLE_OPTIONS.map(({ value, label }) => [label, value])
);

const ROLE_API_MAP = Object.fromEntries(
  ROLE_OPTIONS.map(({ value, label }) => [value, label])
);

const VALID = {
  role: ROLE_OPTIONS.map((r) => r.label),
  domain: DOMAIN_OPTIONS,
  domain_experience: ["0 - 5", "6 - 14", "15+"],
  skill: ["Novice", "Intermediate", "Advanced"],
  leadership: ["Non-Lead", "Leadership"],
  years: ["1-2 years", "3-5 years", "5+ years"],
  degree: ["Unrelated", "related"],
};

// ─── Per-role skill column definitions ──────────────────────────────────────────
// Each entry: { col: Excel column header, key: internal field key }
const ROLE_SKILL_COLS = {
  BA: [
    { col: "Analytical Skills",       key: "analytical_skills" },
    { col: "Technical Proficiency",    key: "technical_proficiency" },
    { col: "Communication Skills",     key: "communication_skills" },
    { col: "Problem Solving",          key: "problem_solving" },
    { col: "Leadership Experience",    key: "leadership_experience", isLeadership: true },
    { col: "Years of Experience",      key: "years_experience",      isExperience: true },
  ],
  BE: [
    { col: "Technical Proficiency",    key: "technical_proficiency" },
    { col: "Analytical Skills",        key: "analytical_skills" },
    { col: "Years of Experience",      key: "years_experience",      isExperience: true },
  ],
  DE: [
    { col: "Technical Proficiency",    key: "technical_proficiency" },
    { col: "Analytical Skills",        key: "analytical_skills" },
    { col: "Leadership Experience",    key: "leadership_experience", isLeadership: true },
    { col: "Years of Experience",      key: "years_experience",      isExperience: true },
  ],
  FE: [
    { col: "Technical Proficiency",    key: "technical_proficiency" },
    { col: "Analytical Skills",        key: "analytical_skills" },
    { col: "Years of Experience",      key: "years_experience",      isExperience: true },
  ],
  FullE: [
    { col: "Technical Proficiency",    key: "technical_proficiency" },
    { col: "Years of Experience",      key: "years_experience",      isExperience: true },
  ],
  PM: [
    { col: "Analytical Skills",        key: "analytical_skills" },
    { col: "Leadership Experience",    key: "leadership_experience", isLeadership: true },
    { col: "Communication Skills",     key: "communication_skills" },
    { col: "Problem Solving",          key: "problem_solving" },
    { col: "Technical Proficiency",    key: "technical_proficiency" },
    { col: "Years of Experience",      key: "years_experience",      isExperience: true },
  ],
  QA: [
    { col: "Communication Skills",     key: "communication_skills" },
    { col: "Technical Proficiency",    key: "technical_proficiency" },
    { col: "Analytical Skills",        key: "analytical_skills" },
    { col: "Leadership Experience",    key: "leadership_experience", isLeadership: true },
    { col: "Years of Experience",      key: "years_experience",      isExperience: true },
  ],
  TL: [
    { col: "Technical Proficiency",    key: "technical_proficiency" },
    { col: "Leadership Experience",    key: "leadership_experience", isLeadership: true },
    { col: "Analytical Skills",        key: "analytical_skills" },
    { col: "Problem Solving",          key: "problem_solving" },
    { col: "Communication Skills",     key: "communication_skills" },
    { col: "Years of Experience",      key: "years_experience",      isExperience: true },
  ],
};

// All possible skill internal keys (superset across all roles)
const ALL_SKILL_KEYS = [
  "analytical_skills",
  "technical_proficiency",
  "communication_skills",
  "problem_solving",
  "leadership_experience",
  "years_experience",
];

// ─── Build columns for a given role ─────────────────────────────────────────────
const getTemplateColumns = (roleKey) => {
  const baseFixed = ["Name", "Age", "Home Town", "Phone Number"];
  const roleCol   = ["Role"];
  const domainCols = ["Domain", "Domain Experience (Years)"];
  const skillCols  = (ROLE_SKILL_COLS[roleKey] || []).map((s) => s.col);
  const eduCols    = ["Bachelor's Degree", "Master's Degree"];
  return [...baseFixed, ...roleCol, ...domainCols, ...skillCols, ...eduCols];
};

// ─── Build COL_MAP for a given role ─────────────────────────────────────────────
const buildColMap = (roleKey) => {
  const base = {
    "Name":                     "name",
    "Age":                      "age",
    "Home Town":                "home",
    "Phone Number":             "phone",
    "Role":                     "role",
    "Domain":                   "domain",
    "Domain Experience (Years)":"domain_experience",
    "Bachelor's Degree":        "bachelors_degree",
    "Master's Degree":          "masters_degree",
  };
  (ROLE_SKILL_COLS[roleKey] || []).forEach(({ col, key }) => {
    base[col] = key;
  });
  return base;
};

// ─── Sample row for a given role + domain ───────────────────────────────────────
const getSampleRow = (roleKey, domain) => {
  const skillDefaults = {
    analytical_skills:     "Advanced",
    technical_proficiency: "Intermediate",
    communication_skills:  "Intermediate",
    problem_solving:       "Advanced",
    leadership_experience: "Non-Lead",
    years_experience:      "3-5 years",
  };
  const roleCols = ROLE_SKILL_COLS[roleKey] || [];
  const skillPart = Object.fromEntries(
    roleCols.map(({ col, key }) => [col, skillDefaults[key] || "Intermediate"])
  );
  return {
    "Name":                     "John Silva",
    "Age":                      30,
    "Home Town":                "Colombo",
    "Phone Number":             "0771234567",
    "Role":                     ROLE_API_MAP[roleKey],
    "Domain":                   domain || "Finance",
    "Domain Experience (Years)":"0 - 5",
    ...skillPart,
    "Bachelor's Degree":        "related",
    "Master's Degree":          "Unrelated",
  };
};

// ─── Role insert field builders ──────────────────────────────────────────────────
const buildDomainExp = (domain, years) => ({ Domain: domain, Years: years });

const ROLE_INSERT_FIELDS = {
  BA: (v) => ({
    "Analytical Skills":                              v.analytical_skills,
    "Technical Proficiency":                          v.technical_proficiency,
    "Communication Skills":                           v.communication_skills,
    "Problem Solving Skills":                         v.problem_solving,
    "Years of experience in Business Analysis":       v.years_experience,
    "Experience of related Domain":                   buildDomainExp(v.domain, v.domain_experience),
    "Leadership-Team lead experience":                v.leadership_experience,
    "Bachelor's Degree":                              v.bachelors_degree,
    "Master's Degree":                                v.masters_degree,
  }),
  BE: (v) => ({
    "Proficiency in Programming Languages":           v.technical_proficiency,
    "Database Management (SQL, NoSQL)":               v.technical_proficiency,
    "API Development and Integration":                v.technical_proficiency,
    "Knowledge of Frameworks":                        v.technical_proficiency,
    "Understanding of Microservices Architecture":    v.analytical_skills,
    "Years of experience in Bacend Engineer":         v.years_experience,
    "Experience of related Domain":                   buildDomainExp(v.domain, v.domain_experience),
    "Bachelor's Degree":                              v.bachelors_degree,
    "Master's Degree":                                v.masters_degree,
  }),
  DE: (v) => ({
    "Scripting and Automation (Python, Bash)":        v.technical_proficiency,
    "Continuous Integration/Continuous Deployment":   v.technical_proficiency,
    "Cloud Platforms ( AWS, Azure, GCP)":             v.technical_proficiency,
    "Configuration Management Tools":                 v.technical_proficiency,
    "Monitoring and Logging Tools":                   v.analytical_skills,
    "Years of experience in DevOps Engineer":         v.years_experience,
    "Experience of related Domain":                   buildDomainExp(v.domain, v.domain_experience),
    "Leadership/Team lead experience":                v.leadership_experience,
    "Bachelor's Degree":                              v.bachelors_degree,
    "Master's Degree":                                v.masters_degree,
  }),
  FE: (v) => ({
    "Proficiency in HTML/CSS":                        v.technical_proficiency,
    "Proficiency in JavaScript/TypeScript":           v.technical_proficiency,
    "Knowledge of Frontend Frameworks/Libraries":     v.technical_proficiency,
    "UI/UX Design Principles":                        v.analytical_skills,
    "Responsive Design and Cross-Browser Compatibility": v.technical_proficiency,
    "Years of experience in FrontEnd engineer":       v.years_experience,
    "Experience of related Domain":                   buildDomainExp(v.domain, v.domain_experience),
    "Bachelor's Degree":                              v.bachelors_degree,
    "Master's Degree":                                v.masters_degree,
  }),
  FullE: (v) => ({
    "Proficiency in Frontend Technologies":           v.technical_proficiency,
    "Proficiency in Backend Technologies ":           v.technical_proficiency,
    "Knowledge of Frontend Frameworks":               v.technical_proficiency,
    "Knowledge of Backend Frameworks":                v.technical_proficiency,
    "Database Management (SQL, NoSQL)":               v.technical_proficiency,
    "API Development and Integration":                v.technical_proficiency,
    "Years of experience in Fullstack engineer":      v.years_experience,
    "Experience of related Domain":                   buildDomainExp(v.domain, v.domain_experience),
    "Bachelor's Degree":                              v.bachelors_degree,
    "Master's Degree":                                v.masters_degree,
  }),
  PM: (v) => ({
    "planning & scheduling":                          v.analytical_skills,
    "Leadership and Team Management":                 v.leadership_experience,
    "Communication Skills":                           v.communication_skills,
    "Risk Management":                                v.problem_solving,
    "Budgeting and Cost Control":                     v.analytical_skills,
    "Knowledge of Project Management Methodologies":  v.technical_proficiency,
    "Years of experience in Fullstack engineer":      v.years_experience,
    "Experience of related Domain":                   buildDomainExp(v.domain, v.domain_experience),
    "Bachelor's Degree":                              v.bachelors_degree,
    "Master's Degree":                                v.masters_degree,
  }),
  QA: (v) => ({
    "Excellent communication ":                       v.communication_skills,
    "Test Automation":                                v.technical_proficiency,
    "Knowledge of testing methodologies":             v.analytical_skills,
    "Bug tracking and reporting":                     v.technical_proficiency,
    "Years of experience in QA":                      v.years_experience,
    "Experience of related Domain":                   buildDomainExp(v.domain, v.domain_experience),
    "Leadership/Team lead experience":                v.leadership_experience,
    "Bachelor's Degree":                              v.bachelors_degree,
    "Master's Degree":                                v.masters_degree,
  }),
  TL: (v) => ({
    "Technical Expertise":                            v.technical_proficiency,
    "Leadership and Team Management":                 v.leadership_experience,
    "Project Management Skills":                      v.analytical_skills,
    "Problem-Solving and Decision-Making":            v.problem_solving,
    "Communication and Collaboration":                v.communication_skills,
    "Years of experience in Tech Lead":               v.years_experience,
    "Experience of related Domain":                   buildDomainExp(v.domain, v.domain_experience),
    "Bachelor's Degree":                              v.bachelors_degree,
    "Master's Degree":                                v.masters_degree,
  }),
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
const getKpiColor  = (s) => s >= 61 ? "#52c41a" : s >= 31 ? "#faad14" : "#ff4d4f";
const getCategory  = (s) => s >= 61 ? "High"    : s >= 31 ? "Medium"  : "Low";
const getCatTag    = (cat) => {
  if (cat === "High")   return <Tag icon={<CheckCircleOutlined />}  color="success">High</Tag>;
  if (cat === "Medium") return <Tag icon={<WarningOutlined />}      color="warning">Medium</Tag>;
  return                       <Tag icon={<CloseCircleOutlined />}  color="error">Low</Tag>;
};

// ─── Validate a parsed row ────────────────────────────────────────────────────────
// When roleKey / domain are pre-filtered, validate against those; otherwise open validation
const validateRow = (row, filterRole, filterDomain) => {
  const errors = [];

  if (!row.name?.trim())               errors.push("Name is required");
  if (!row.age || isNaN(Number(row.age))) errors.push("Age must be a number");
  if (!row.home?.trim())               errors.push("Home Town is required");
  if (!row.phone?.trim())              errors.push("Phone Number is required");

  const roleKey = ROLE_LABEL_TO_KEY[row.role];
  if (!roleKey) {
    errors.push(`Invalid Role: "${row.role}"`);
  } else if (filterRole && roleKey !== filterRole) {
    errors.push(`Role must be "${ROLE_API_MAP[filterRole]}" for this template (got "${row.role}")`);
  }

  if (!VALID.domain.includes(row.domain)) {
    errors.push(`Invalid Domain: "${row.domain}"`);
  } else if (filterDomain && row.domain !== filterDomain) {
    errors.push(`Domain must be "${filterDomain}" for this template (got "${row.domain}")`);
  }

  if (!VALID.domain_experience.includes(row.domain_experience))
    errors.push(`Invalid Domain Experience: "${row.domain_experience}"`);

  // Only validate skill keys that are relevant for this role
  const relevantKeys = roleKey
    ? (ROLE_SKILL_COLS[roleKey] || []).map((s) => s.key)
    : ALL_SKILL_KEYS;

  if (relevantKeys.includes("analytical_skills") && !VALID.skill.includes(row.analytical_skills))
    errors.push(`Invalid Analytical Skills: "${row.analytical_skills}"`);
  if (relevantKeys.includes("technical_proficiency") && !VALID.skill.includes(row.technical_proficiency))
    errors.push(`Invalid Technical Proficiency: "${row.technical_proficiency}"`);
  if (relevantKeys.includes("communication_skills") && !VALID.skill.includes(row.communication_skills))
    errors.push(`Invalid Communication Skills: "${row.communication_skills}"`);
  if (relevantKeys.includes("problem_solving") && !VALID.skill.includes(row.problem_solving))
    errors.push(`Invalid Problem Solving: "${row.problem_solving}"`);
  if (relevantKeys.includes("leadership_experience") && !VALID.leadership.includes(row.leadership_experience))
    errors.push(`Invalid Leadership Experience: "${row.leadership_experience}"`);
  if (!VALID.years.includes(row.years_experience))
    errors.push(`Invalid Years of Experience: "${row.years_experience}"`);
  if (!VALID.degree.includes(row.bachelors_degree))
    errors.push(`Invalid Bachelor's Degree: "${row.bachelors_degree}"`);
  if (!VALID.degree.includes(row.masters_degree))
    errors.push(`Invalid Master's Degree: "${row.masters_degree}"`);

  return errors;
};

// ─── Download filtered Excel template ────────────────────────────────────────────
const downloadTemplate = (roleKey, domain) => {
  const wb = XLSX.utils.book_new();
  const cols = getTemplateColumns(roleKey);
  const sample = getSampleRow(roleKey, domain);
  const sampleValues = cols.map((c) => sample[c] ?? "");

  const dataSheet = XLSX.utils.aoa_to_sheet([cols, sampleValues]);
  dataSheet["!cols"] = cols.map((c) => ({ wch: Math.max(c.length + 2, 18) }));
  XLSX.utils.book_append_sheet(wb, dataSheet, "Employees");

  // Skills valid for this role
  const skillCols = ROLE_SKILL_COLS[roleKey] || [];
  const validRows = [
    ["Field", "Valid Values"],
    ["Role",  ROLE_API_MAP[roleKey]],
    ["Domain", domain],
    ["Domain Experience (Years)", VALID.domain_experience.join(", ")],
    ...skillCols.map(({ col, isLeadership, isExperience }) => [
      col,
      isLeadership
        ? VALID.leadership.join(", ")
        : isExperience
        ? VALID.years.join(", ")
        : VALID.skill.join(", "),
    ]),
    ["Bachelor's Degree", VALID.degree.join(", ")],
    ["Master's Degree",   VALID.degree.join(", ")],
    [],
    ["Notes", ""],
    ["- Age",          "Must be a number (e.g. 28)"],
    ["- Phone Number", "Enter as text (e.g. 0771234567)"],
    ["- Name / Home Town", "Any text"],
  ];
  const refSheet = XLSX.utils.aoa_to_sheet(validRows);
  refSheet["!cols"] = [{ wch: 34 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, refSheet, "Valid Values (Reference)");

  const roleName = ROLE_API_MAP[roleKey].replace(/\s+/g, "_");
  XLSX.writeFile(wb, `bulk_upload_${roleName}_${domain}.xlsx`);
};

// ─── Parse uploaded Excel ────────────────────────────────────────────────────────
const parseExcel = (file, filterRole, filterDomain) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb  = XLSX.read(e.target.result, { type: "array" });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

        // Build col map based on filter role (or fallback to full map)
        const colMap = filterRole
          ? buildColMap(filterRole)
          : buildColMap("BA"); // fallback — will still map base cols

        // Also build a universal skill col map across all roles for unknown-role uploads
        const universalSkillMap = {};
        Object.values(ROLE_SKILL_COLS).forEach((cols) => {
          cols.forEach(({ col, key }) => { universalSkillMap[col] = key; });
        });

        const rows = raw.map((r, idx) => {
          const mapped = {};
          // Try filtered col map first, then universal
          const mergedMap = { ...universalSkillMap, ...colMap };
          for (const [excelCol, internalKey] of Object.entries(mergedMap)) {
            const val =
              r[excelCol] ??
              Object.values(r)[
                Object.keys(r).findIndex((k) => k.trim() === excelCol.trim())
              ] ??
              "";
            mapped[internalKey] = String(val ?? "").trim();
          }

          const errors = validateRow(mapped, filterRole || null, filterDomain || null);
          return {
            _rowKey:     `row_${idx}`,
            _rowNum:     idx + 2,
            _errors:     errors,
            _valid:      errors.length === 0,
            _status:     "pending",
            _prediction: null,
            _saveError:  null,
            _selected:   errors.length === 0,
            ...mapped,
          };
        });

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsArrayBuffer(file);
  });
};

// ══════════════════════════════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════════════════════════════
const BulkAddEmployee = () => {
  const [filterRole,   setFilterRole]   = useState(null);
  const [filterDomain, setFilterDomain] = useState(null);
  const [rows,         setRows]         = useState([]);
  const [phase,        setPhase]        = useState("idle");
  const [predicting,   setPredicting]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [fileName,     setFileName]     = useState(null);
  const [validationModal, setValidationModal] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const fileInputRef = useRef(null);

  const canDownload = !!filterRole && !!filterDomain;

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = await parseExcel(file, filterRole, filterDomain);
      setRows(parsed);
      setSelectedKeys(parsed.filter((r) => r._valid).map((r) => r._rowKey));
      setPhase("preview");
    } catch (err) {
      Swal.fire("Parse Error", `Could not read Excel file: ${err.message}`, "error");
    }
    e.target.value = "";
  };

  const updateRow = (key, patch) =>
    setRows((prev) => prev.map((r) => (r._rowKey === key ? { ...r, ...patch } : r)));

  // ── Predict KPI for selected valid rows ───────────────────────────────────
  const handlePredictAll = async () => {
    const targets = rows.filter((r) => r._valid && selectedKeys.includes(r._rowKey));
    if (!targets.length) return;

    setPredicting(true);
    setPhase("predicting");

    for (const row of targets) {
      updateRow(row._rowKey, { _status: "predicting" });
      const roleKey = ROLE_LABEL_TO_KEY[row.role];
      const mlPayload = {
        role:                 ROLE_API_MAP[roleKey],
        domain:               row.domain,
        analytical_skills:    row.analytical_skills    || "Intermediate",
        technical_proficiency:row.technical_proficiency|| "Intermediate",
        communication_skills: row.communication_skills || "Intermediate",
        problem_solving:      row.problem_solving      || "Intermediate",
        domain_expertise:     row.technical_proficiency|| "Intermediate",
        years_experience:     row.years_experience     || "1-2 years",
        domain_experience:    row.domain_experience,
        leadership_experience:row.leadership_experience|| "Non-Lead",
        bachelors_degree:     row.bachelors_degree     || "Unrelated",
        masters_degree:       row.masters_degree       || "Unrelated",
      };
      try {
        const res  = await axios.post("ml/predict_kpi", mlPayload);
        const data = res.data.prediction ?? res.data;
        updateRow(row._rowKey, { _status: "done", _prediction: data });
      } catch (err) {
        updateRow(row._rowKey, { _status: "error", _prediction: null, _saveError: err.message });
      }
    }

    setPredicting(false);
    setPhase("results");
  };

  // ── Save a single row ──────────────────────────────────────────────────────
  const saveRow = async (row) => {
    const roleKey = ROLE_LABEL_TO_KEY[row.role];
    if (!roleKey) return false;
    const insertFn   = ROLE_INSERT_FIELDS[roleKey];
    const insert_json = {
      Name: row.name, Age: row.age,
      "Home Town": row.home, "Phone Number": row.phone,
      ...insertFn(row),
    };
    try {
      await axios.post("employee/insert", { role: ROLE_API_MAP[roleKey], insert_json });
      return true;
    } catch (err) {
      return err.message || "Save failed";
    }
  };

  // ── Save all predicted rows ────────────────────────────────────────────────
  const handleSaveAll = async () => {
    const targets = rows.filter((r) => r._status === "done" && selectedKeys.includes(r._rowKey));
    if (!targets.length) return;

    setSaving(true);
    let successCount = 0, failCount = 0;

    for (const row of targets) {
      updateRow(row._rowKey, { _status: "predicting" });
      const result = await saveRow(row);
      if (result === true) {
        updateRow(row._rowKey, { _status: "saved", _saveError: null });
        successCount++;
      } else {
        updateRow(row._rowKey, { _status: "done", _saveError: typeof result === "string" ? result : "Save failed" });
        failCount++;
      }
    }

    setSaving(false);
    if (failCount === 0) {
      Swal.fire(`${successCount} Employee${successCount > 1 ? "s" : ""} Saved!`, "All employees have been added.", "success");
    } else {
      Swal.fire("Partial Save", `${successCount} saved, ${failCount} failed.`, "warning");
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setRows([]);
    setPhase("idle");
    setFileName(null);
    setSelectedKeys([]);
  };

  const handleFilterChange = () => {
    // If filters change after an upload, reset the upload so user re-uploads with correct template
    if (phase !== "idle") handleReset();
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const validRows   = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);
  const doneRows    = rows.filter((r) => r._status === "done");
  const savedRows   = rows.filter((r) => r._status === "saved");
  const selectedValid = selectedKeys.filter((k) => rows.find((r) => r._rowKey === k && r._valid));

  // ─── Retry single prediction ────────────────────────────────────────────────
  const retryRow = async (row) => {
    updateRow(row._rowKey, { _status: "predicting", _saveError: null });
    const roleKey = ROLE_LABEL_TO_KEY[row.role];
    const mlPayload = {
      role:                  ROLE_API_MAP[roleKey],
      domain:                row.domain,
      analytical_skills:     row.analytical_skills    || "Intermediate",
      technical_proficiency: row.technical_proficiency|| "Intermediate",
      communication_skills:  row.communication_skills || "Intermediate",
      problem_solving:       row.problem_solving      || "Intermediate",
      domain_expertise:      row.technical_proficiency|| "Intermediate",
      years_experience:      row.years_experience     || "1-2 years",
      domain_experience:     row.domain_experience,
      leadership_experience: row.leadership_experience|| "Non-Lead",
      bachelors_degree:      row.bachelors_degree     || "Unrelated",
      masters_degree:        row.masters_degree       || "Unrelated",
    };
    try {
      const res  = await axios.post("ml/predict_kpi", mlPayload);
      const data = res.data.prediction ?? res.data;
      updateRow(row._rowKey, { _status: "done", _prediction: data });
    } catch (err) {
      updateRow(row._rowKey, { _status: "error", _saveError: err.message });
    }
  };

  // ─── Table columns ──────────────────────────────────────────────────────────
  const skillTag = (v) => {
    const color = v === "Advanced" ? "green" : v === "Intermediate" ? "blue" : "default";
    return <Tag color={color} style={{ fontSize: 11 }}>{v || "—"}</Tag>;
  };

  const columns = [
    {
      title: "",
      dataIndex: "_rowKey",
      width: 48,
      render: (key, row) =>
        row._valid ? (
          <Checkbox
            checked={selectedKeys.includes(key)}
            onChange={(e) =>
              setSelectedKeys((prev) =>
                e.target.checked ? [...prev, key] : prev.filter((k) => k !== key)
              )
            }
            disabled={row._status === "saved" || row._status === "predicting"}
          />
        ) : null,
    },
    {
      title: "Row", dataIndex: "_rowNum", width: 52,
      render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Name", dataIndex: "name", width: 140,
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{v || "—"}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{row.role}</Text>
        </div>
      ),
    },
    {
      title: "Domain", dataIndex: "domain", width: 110,
      render: (v) => <Tag color="blue" style={{ fontSize: 11 }}>{v || "—"}</Tag>,
    },
    {
      title: "Technical", dataIndex: "technical_proficiency", width: 100,
      render: (v) => skillTag(v),
    },
    {
      title: "Analytical", dataIndex: "analytical_skills", width: 100,
      render: (v) => skillTag(v),
    },
    {
      title: "Experience", dataIndex: "years_experience", width: 100,
      render: (v) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "KPI Score", dataIndex: "_prediction", width: 160,
      render: (pred, row) => {
        if (row._status === "predicting")
          return <Spin indicator={<LoadingOutlined spin style={{ fontSize: 16 }} />} />;
        if (row._status === "error" || (!pred && row._status !== "pending"))
          return <Tag color="error">Prediction Failed</Tag>;
        if (!pred)
          return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        const score = pred.predicted_kpi_score;
        const cat   = pred.performance_category || getCategory(score);
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: getKpiColor(score) }}>{score}</span>
              <span style={{ fontSize: 11, color: "#aaa" }}>/100</span>
            </div>
            <Progress percent={score} strokeColor={getKpiColor(score)} trailColor="#f0f0f0" strokeWidth={6} showInfo={false} style={{ marginTop: 2 }} />
            {getCatTag(cat)}
          </div>
        );
      },
    },
    {
      title: "Status", dataIndex: "_status", width: 130,
      render: (status, row) => {
        if (!row._valid)
          return (
            <div>
              <Tag color="error">Invalid</Tag>
              <Button type="link" size="small" style={{ padding: 0, fontSize: 11 }} onClick={() => setValidationModal(row)}>
                View errors ({row._errors.length})
              </Button>
            </div>
          );
        const map = {
          pending:    <Tag color="default">Pending</Tag>,
          predicting: <Tag icon={<LoadingOutlined spin />} color="processing">Processing</Tag>,
          done:       row._saveError
                        ? <div><Tag color="warning">Predicted</Tag><div style={{ fontSize: 11, color: "#ff4d4f", marginTop: 2 }}>{row._saveError}</div></div>
                        : <Tag color="success">Predicted</Tag>,
          error:      <Tag color="error">Predict Failed</Tag>,
          saved:      <Tag icon={<CheckCircleOutlined />} color="green">Saved</Tag>,
        };
        return map[status] || null;
      },
    },
    {
      title: "", width: 60,
      render: (_, row) => {
        if (row._status === "done")
          return (
            <Tooltip title="Save this employee">
              <Button
                size="small" type="primary" icon={<SaveOutlined />}
                style={{ background: "#389e0d", borderColor: "#389e0d" }}
                onClick={async () => {
                  updateRow(row._rowKey, { _status: "predicting" });
                  const result = await saveRow(row);
                  if (result === true) {
                    updateRow(row._rowKey, { _status: "saved", _saveError: null });
                    Swal.fire("Saved!", `${row.name} has been added.`, "success");
                  } else {
                    updateRow(row._rowKey, { _status: "done", _saveError: result || "Save failed" });
                  }
                }}
              />
            </Tooltip>
          );
        if (row._status === "error")
          return (
            <Tooltip title="Retry prediction">
              <Button size="small" icon={<ReloadOutlined />} onClick={() => retryRow(row)} />
            </Tooltip>
          );
        return null;
      },
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Step 0: Filter Selection ── */}
      <Card
        style={{
          marginBottom: 20,
          borderRadius: 10,
          border: "1px solid #d0e4f7",
          background: "#f0f7ff",
        }}
        bodyStyle={{ padding: "18px 24px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <FilterOutlined style={{ color: "#1F4E79", fontSize: 16 }} />
          <span style={{ fontWeight: 600, color: "#1F4E79", fontSize: 15 }}>
            Step 1 — Select Role &amp; Domain
          </span>
          <Tag color="blue" style={{ marginLeft: 4, fontSize: 11 }}>Required before downloading template</Tag>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 6, fontWeight: 500 }}>Role</div>
            <Select
              placeholder="Select a role"
              style={{ width: "100%" }}
              value={filterRole}
              onChange={(val) => {
                setFilterRole(val);
                handleFilterChange();
              }}
              allowClear
              onClear={() => { setFilterRole(null); handleFilterChange(); }}
            >
              {ROLE_OPTIONS.map(({ value, label }) => (
                <Option key={value} value={value}>{label}</Option>
              ))}
            </Select>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 6, fontWeight: 500 }}>Domain</div>
            <Select
              placeholder="Select a domain"
              style={{ width: "100%" }}
              value={filterDomain}
              onChange={(val) => {
                setFilterDomain(val);
                handleFilterChange();
              }}
              allowClear
              onClear={() => { setFilterDomain(null); handleFilterChange(); }}
            >
              {DOMAIN_OPTIONS.map((d) => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Select>
          </div>

          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: "transparent", marginBottom: 6 }}>—</div>
            {canDownload ? (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => downloadTemplate(filterRole, filterDomain)}
                style={{ background: "#1F4E79", borderColor: "#1F4E79" }}
              >
                Download Template
              </Button>
            ) : (
              <Tooltip title="Select both Role and Domain first">
                <Button icon={<DownloadOutlined />} disabled>
                  Download Template
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        {canDownload && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#2E75B6" }}>
            ✓ Template will be pre-configured for{" "}
            <strong>{ROLE_API_MAP[filterRole]}</strong> ·{" "}
            <strong>{filterDomain}</strong> with only the relevant skill columns.
          </div>
        )}
      </Card>

      {/* ── Steps 2 & 3 ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          {
            step: 2,
            icon: <FileExcelOutlined />,
            label: "Fill in Details",
            desc: "Add one employee per row. See the Valid Values sheet in the template.",
          },
          {
            step: 3,
            icon: <UploadOutlined />,
            label: "Upload & Preview",
            desc: "Upload your completed Excel file to validate and preview.",
            action: (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canDownload}
                  style={
                    canDownload
                      ? { borderColor: "#2E75B6", color: "#2E75B6" }
                      : {}
                  }
                >
                  {fileName ? "Re-upload" : "Upload Excel"}
                </Button>
                {!canDownload && (
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                    Select Role &amp; Domain first
                  </div>
                )}
              </>
            ),
          },
        ].map(({ step, label, desc, action }) => (
          <div
            key={step}
            style={{
              flex: 1,
              minWidth: 220,
              background: "#f8faff",
              border: "1px solid #d0e4f7",
              borderRadius: 10,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "#1F4E79", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}
              >
                {step}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "#1F4E79", fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{desc}</div>
              </div>
            </div>
            {action && <div style={{ marginTop: 4 }}>{action}</div>}
          </div>
        ))}
      </div>

      {/* ── File info bar ── */}
      {phase !== "idle" && (
        <div
          style={{
            background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10,
            padding: "14px 20px", marginBottom: 16,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <FileExcelOutlined style={{ fontSize: 22, color: "#52c41a" }} />
            <div>
              <div style={{ fontWeight: 600, color: "#333" }}>{fileName}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{rows.length} rows detected</div>
            </div>
          </div>
          <Space wrap>
            <Badge count={validRows.length} style={{ backgroundColor: "#52c41a" }} showZero>
              <Tag color="success" style={{ fontSize: 12 }}>Valid</Tag>
            </Badge>
            {invalidRows.length > 0 && (
              <Badge count={invalidRows.length} style={{ backgroundColor: "#ff4d4f" }}>
                <Tag color="error" style={{ fontSize: 12 }}>Invalid</Tag>
              </Badge>
            )}
            {doneRows.length > 0 && (
              <Badge count={doneRows.length} style={{ backgroundColor: "#2E75B6" }}>
                <Tag color="blue" style={{ fontSize: 12 }}>Predicted</Tag>
              </Badge>
            )}
            {savedRows.length > 0 && (
              <Badge count={savedRows.length} style={{ backgroundColor: "#389e0d" }}>
                <Tag color="green" style={{ fontSize: 12 }}>Saved</Tag>
              </Badge>
            )}
            <Button size="small" icon={<DeleteOutlined />} danger onClick={handleReset}>Clear</Button>
          </Space>
        </div>
      )}

      {/* ── Invalid rows alert ── */}
      {invalidRows.length > 0 && phase !== "idle" && (
        <Alert
          type="warning" showIcon icon={<WarningOutlined />}
          message={`${invalidRows.length} row${invalidRows.length > 1 ? "s" : ""} have validation errors and will be skipped.`}
          description="Click 'View errors' on any row to see details, fix in Excel, then re-upload."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* ── Action bar ── */}
      {phase !== "idle" && (
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16, flexWrap: "wrap", gap: 10,
          }}
        >
          <div style={{ fontSize: 13, color: "#555" }}>
            <Checkbox
              checked={selectedValid.length === validRows.length && validRows.length > 0}
              indeterminate={selectedValid.length > 0 && selectedValid.length < validRows.length}
              onChange={(e) =>
                setSelectedKeys(e.target.checked ? validRows.map((r) => r._rowKey) : [])
              }
              style={{ marginRight: 8 }}
            />
            Select all valid ({selectedValid.length}/{validRows.length} selected)
          </div>
          <Space>
            {(phase === "preview" || phase === "results") && (
              <Button
                type="primary" icon={<TrophyOutlined />} loading={predicting}
                disabled={selectedValid.length === 0} onClick={handlePredictAll}
                style={{ background: "#1F4E79", borderColor: "#1F4E79", minWidth: 200 }}
              >
                {predicting
                  ? "Predicting KPIs..."
                  : `Predict KPI for ${selectedValid.length} Employee${selectedValid.length !== 1 ? "s" : ""}`}
              </Button>
            )}
            {(phase === "results" || phase === "predicting") && (
              <Button
                type="primary" icon={<SaveOutlined />} loading={saving}
                disabled={doneRows.filter((r) => selectedKeys.includes(r._rowKey)).length === 0}
                onClick={handleSaveAll}
                style={{ background: "#389e0d", borderColor: "#389e0d", minWidth: 200 }}
              >
                {saving
                  ? "Saving..."
                  : `Save ${doneRows.filter((r) => selectedKeys.includes(r._rowKey)).length} Employee${doneRows.filter((r) => selectedKeys.includes(r._rowKey)).length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </Space>
        </div>
      )}

      {/* ── Summary stats ── */}
      {phase === "results" && doneRows.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "High Performers",    count: doneRows.filter((r) => r._prediction?.performance_category === "High").length,   color: "#52c41a", bg: "#f6ffed", border: "#b7eb8f" },
            { label: "Needs Improvement",  count: doneRows.filter((r) => r._prediction?.performance_category === "Medium").length, color: "#faad14", bg: "#fffbe6", border: "#ffe58f" },
            { label: "Needs Intervention", count: doneRows.filter((r) => r._prediction?.performance_category === "Low").length,    color: "#ff4d4f", bg: "#fff2f0", border: "#ffccc7" },
            {
              label: "Average KPI",
              count: doneRows.length > 0
                ? (doneRows.reduce((s, r) => s + (r._prediction?.predicted_kpi_score || 0), 0) / doneRows.length).toFixed(1)
                : "—",
              color: "#2E75B6", bg: "#f0f8ff", border: "#91caff", suffix: "/100",
            },
          ].map(({ label, count, color, bg, border, suffix }) => (
            <div
              key={label}
              style={{
                flex: 1, minWidth: 160, background: bg,
                border: `1px solid ${border}`, borderRadius: 8,
                padding: "12px 16px", textAlign: "center",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, color }}>
                {count}
                {suffix && <span style={{ fontSize: 13, fontWeight: 400, color: "#aaa" }}>{suffix}</span>}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      {rows.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, overflow: "hidden" }}>
          <Table
            dataSource={rows} columns={columns} rowKey="_rowKey" size="small"
            pagination={{ pageSize: 15, showSizeChanger: false }}
            rowClassName={(row) => row._status === "saved" ? "row-saved" : !row._valid ? "row-invalid" : ""}
            scroll={{ x: 900 }}
          />
        </div>
      )}

      {/* ── Idle state ── */}
      {phase === "idle" && (
        <div
          style={{
            background: "#fafafa", border: "2px dashed #d9d9d9",
            borderRadius: 12, padding: "48px 24px", textAlign: "center",
          }}
        >
          <FileExcelOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: "#aaa", marginBottom: 8 }}>
            {canDownload
              ? "Template ready — fill it in and upload to continue."
              : "Select a Role & Domain above, then download the template."}
          </div>
          {canDownload && (
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary" icon={<DownloadOutlined />}
                onClick={() => downloadTemplate(filterRole, filterDomain)}
                style={{ background: "#1F4E79", borderColor: "#1F4E79" }}
              >
                Download Template
              </Button>
              <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
                Upload Excel
              </Button>
            </Space>
          )}
          <input
            ref={fileInputRef} type="file" accept=".xlsx,.xls"
            style={{ display: "none" }} onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── Validation errors modal ── */}
      <Modal
        open={!!validationModal}
        onCancel={() => setValidationModal(null)}
        title={
          <span style={{ color: "#ff4d4f" }}>
            <WarningOutlined style={{ marginRight: 8 }} />
            Row {validationModal?._rowNum} — Validation Errors
          </span>
        }
        footer={[<Button key="ok" onClick={() => setValidationModal(null)}>Close</Button>]}
        width={520}
      >
        {validationModal?._errors?.map((err, i) => (
          <Alert key={i} type="error" message={err} showIcon style={{ marginBottom: 8 }} />
        ))}
        <Divider />
        <Alert type="info" message="Fix these issues in your Excel file and re-upload." showIcon icon={<InfoCircleOutlined />} />
      </Modal>

      <style>{`
        .row-saved td { background: #f6ffed !important; }
        .row-invalid td { background: #fff2f0 !important; opacity: 0.8; }
        .ant-table-row:hover.row-saved td { background: #d9f7be !important; }
        .ant-table-row:hover.row-invalid td { background: #ffccc7 !important; }
      `}</style>
    </div>
  );
};

export default BulkAddEmployee;