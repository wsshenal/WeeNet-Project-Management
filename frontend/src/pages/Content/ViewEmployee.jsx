import React, { useState } from "react";
import {
  Button,
  Form,
  Table,
  Select,
  Card,
  Alert,
  Spin,
  Modal,
  Tag,
} from "antd";
import {
  SearchOutlined,
  UserOutlined,
  IdcardOutlined,
  TeamOutlined,
  LoadingOutlined,
  TrophyOutlined,
  RiseOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import axios from "../../apis/axiosInstance";

const { Option } = Select;

const ROLES = [
  "Business Analyst",
  "Quality Assurance Engineer",
  "DevOps Engineer",
  "Tech Lead",
  "Backend Engineer",
  "Frontend Engineer",
  "FullStack Engineer",
  "Project Manager",
];

// ─── Colour helpers ────────────────────────────────────────────────────────────
const kpiColor = (v) => (v >= 61 ? "#52c41a" : v >= 31 ? "#faad14" : "#ff4d4f");
const kpiLabel = (v) => (v >= 61 ? "High" : v >= 31 ? "Medium" : "Low");
const barColors = [
  "#6A953F",
  "#52c41a",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#10b981",
];

// ─── Gauge ─────────────────────────────────────────────────────────────────────
const Gauge = ({ value }) => {
  const radius = 68;
  const cx = 110;
  const cy = 105; // sits lower so arc top has room, score fits inside arc
  const pct = Math.min(100, Math.max(0, value)) / 100;
  const angle = Math.PI - pct * Math.PI;

  const trackD = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${
    cx + radius
  } ${cy}`;
  const ex = cx + radius * Math.cos(angle);
  const ey = cy - radius * Math.sin(angle);
  const largeArc = pct > 0.5 ? 1 : 0;
  const fillD =
    pct > 0
      ? `M ${
          cx - radius
        } ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`
      : "";

  // Needle tip stops 12px short of arc inner edge
  const needleLen = radius - 14;
  const needleX = cx + needleLen * Math.cos(angle);
  const needleY = cy - needleLen * Math.sin(angle);
  const color = kpiColor(value);

  const zones = [
    { offset: "0%", color: "#ff4d4f" },
    { offset: "38%", color: "#faad14" },
    { offset: "65%", color: "#52c41a" },
    { offset: "100%", color: "#52c41a" },
  ];

  // End-point tick labels (0 and 100) only — positioned outside arc ends
  const endTicks = [
    { tick: 0, label: "0" },
    { tick: 100, label: "100" },
  ];

  return (
    // viewBox: x from 0 to 220, y from 10 (above arc top ~cy-radius=37) to 125 (below baseline)
    <svg width={220} height={125} viewBox="0 10 220 125">
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          {zones.map((z, i) => (
            <stop key={i} offset={z.offset} stopColor={z.color} />
          ))}
        </linearGradient>
      </defs>

      {/* Grey background arc */}
      <path
        d={trackD}
        fill="none"
        stroke="#ebebeb"
        strokeWidth={18}
        strokeLinecap="round"
      />

      {/* Coloured progress arc */}
      {fillD && (
        <path
          d={fillD}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={18}
          strokeLinecap="round"
        />
      )}

      {/* End tick labels */}
      {endTicks.map(({ tick, label }) => {
        const a = Math.PI - (tick / 100) * Math.PI;
        const tx = cx + (radius + 14) * Math.cos(a);
        const ty = cy - (radius + 14) * Math.sin(a);
        return (
          <text
            key={tick}
            x={tx}
            y={ty}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="#bbb"
          >
            {label}
          </text>
        );
      })}

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Clean pivot dot */}
      <circle cx={cx} cy={cy} r={6} fill={color} />
      <circle cx={cx} cy={cy} r={2.5} fill="#fff" />

      {/* Score text — centred INSIDE the arc (above the baseline) */}
      <text
        x={cx}
        y={cy - 26}
        textAnchor="middle"
        fontSize={30}
        fontWeight={800}
        fill={color}
        letterSpacing="-0.5"
      >
        {value}
      </text>
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fill="#bbb">
        out of 100
      </text>
    </svg>
  );
};

// ─── Custom tooltip for bar chart ─────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div
      style={{
        background: "#fff",
        border: `2px solid ${kpiColor(val)}`,
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, color: "#1F4E79", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color: kpiColor(val), fontWeight: 700 }}>KPI: {val}</div>
      <div style={{ fontSize: 11, color: "#888" }}>
        {kpiLabel(val)} performance
      </div>
    </div>
  );
};

// ─── Custom tooltip for radar chart ───────────────────────────────────────────
const RadarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #d0e4f7",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 12,
        maxWidth: 200,
      }}
    >
      <div style={{ fontWeight: 700, color: "#1F4E79", marginBottom: 2 }}>
        {d.full_name}
      </div>
      <div style={{ color: "#6A953F" }}>
        Level: <strong>{d.value}</strong>
      </div>
      <div style={{ color: "#888" }}>Score: {d.score}/100</div>
    </div>
  );
};

// ─── KPI Detail Modal ──────────────────────────────────────────────────────────
const KpiDetailModal = ({ open, onClose, empId, role }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetail = async () => {
    if (!empId || !role) return;
    setLoading(true);
    setDetail(null);
    setError(null);
    try {
      const res = await axios.post("kpi/employee/detail", {
        emp_id: empId,
        role,
      });
      if (res.data.status === "success") {
        setDetail(res.data);
      } else {
        setError(res.data.message || "Failed to load details.");
      }
    } catch {
      setError("Could not load KPI details. Please try again.");
    }
    setLoading(false);
  };

  const cat = detail ? kpiLabel(detail.avg_kpi) : null;
  const catColor = cat ? kpiColor(detail.avg_kpi) : "#888";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={820}
      afterOpenChange={(v) => v && fetchDetail()}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TrophyOutlined style={{ fontSize: 20, color: "#6A953F" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1F4E79" }}>
              KPI Performance Details
            </div>
            <div style={{ fontSize: 12, color: "#888", fontWeight: 400 }}>
              {empId} · {role}
            </div>
          </div>
        </div>
      }
      styles={{
        body: { maxHeight: "80vh", overflowY: "auto", padding: "16px 24px" },
      }}
    >
      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin
            indicator={
              <LoadingOutlined
                style={{ fontSize: 36, color: "#6A953F" }}
                spin
              />
            }
          />
          <div style={{ marginTop: 14, color: "#6A953F", fontWeight: 600 }}>
            Loading KPI breakdown...
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Alert
          type="error"
          message={error}
          showIcon
          action={
            <Button size="small" onClick={fetchDetail}>
              Retry
            </Button>
          }
        />
      )}

      {/* Content */}
      {detail && !loading && (
        <div>
          {/* ── Employee Info Bar ── */}
          <div
            style={{
              background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
              border: "1px solid #86efac",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 20,
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1F4E79" }}>
                {detail.info.name || empId}
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>{role}</div>
            </div>
            {detail.info.age && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 13,
                  color: "#555",
                }}
              >
                <CalendarOutlined style={{ color: "#6A953F" }} /> Age{" "}
                {detail.info.age}
              </div>
            )}
            {detail.info.home_town && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 13,
                  color: "#555",
                }}
              >
                <EnvironmentOutlined style={{ color: "#6A953F" }} />{" "}
                {detail.info.home_town}
              </div>
            )}
            {detail.info.phone && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 13,
                  color: "#555",
                }}
              >
                <PhoneOutlined style={{ color: "#6A953F" }} />{" "}
                {detail.info.phone}
              </div>
            )}
            <div style={{ marginLeft: "auto" }}>
              <Tag
                color={
                  cat === "High"
                    ? "success"
                    : cat === "Medium"
                    ? "warning"
                    : "error"
                }
                style={{
                  fontSize: 13,
                  padding: "4px 14px",
                  borderRadius: 20,
                  fontWeight: 700,
                }}
              >
                {cat} Performance
              </Tag>
            </div>
          </div>

          {/* ── Row 1: Gauge + Domain Bar Chart ── */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {/* Gauge */}
            <div
              style={{
                flex: "0 0 230px",
                background: "#fff",
                border: "1px solid #e8e8e8",
                borderRadius: 10,
                padding: "18px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1F4E79",
                  marginBottom: 8,
                }}
              >
                Overall KPI
              </div>
              <Gauge value={detail.avg_kpi} />
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#888",
                  textAlign: "center",
                }}
              >
                Average across {detail.domain_kpis.length} domain
                {detail.domain_kpis.length !== 1 ? "s" : ""}
              </div>
              {/* Mini legend */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 10,
                  fontSize: 10,
                }}
              >
                {[
                  ["#ff4d4f", "Low"],
                  ["#faad14", "Medium"],
                  ["#52c41a", "High"],
                ].map(([c, l]) => (
                  <div
                    key={l}
                    style={{ display: "flex", alignItems: "center", gap: 3 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: c,
                      }}
                    />
                    <span style={{ color: "#888" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Domain bar chart */}
            <div
              style={{
                flex: 1,
                minWidth: 280,
                background: "#fff",
                border: "1px solid #e8e8e8",
                borderRadius: 10,
                padding: "16px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1F4E79",
                  marginBottom: 10,
                }}
              >
                KPI by Domain
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={detail.domain_kpis}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="domain"
                    tick={{ fontSize: 11, fill: "#555" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#aaa" }}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <ReferenceLine
                    y={61}
                    stroke="#52c41a"
                    strokeDasharray="4 2"
                    label={{
                      value: "High (61)",
                      position: "insideTopRight",
                      fontSize: 9,
                      fill: "#52c41a",
                    }}
                  />
                  <ReferenceLine
                    y={31}
                    stroke="#faad14"
                    strokeDasharray="4 2"
                    label={{
                      value: "Med (31)",
                      position: "insideTopRight",
                      fontSize: 9,
                      fill: "#faad14",
                    }}
                  />
                  <Bar dataKey="kpi" radius={[4, 4, 0, 0]}>
                    {detail.domain_kpis.map((entry, i) => (
                      <Cell key={i} fill={kpiColor(entry.kpi)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Row 2: Radar Chart ── */}
          {detail.radar.length > 0 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e8e8e8",
                borderRadius: 10,
                padding: "16px 12px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1F4E79",
                  marginBottom: 4,
                }}
              >
                Skill Profile — {role}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>
                Novice = 20 · Intermediate = 50 · Advanced = 100
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <ResponsiveContainer width="55%" height={260} minWidth={240}>
                  <RadarChart data={detail.radar}>
                    <PolarGrid stroke="#e8e8e8" />
                    <PolarAngleAxis
                      dataKey="skill"
                      tick={{ fontSize: 10, fill: "#555" }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: "#bbb" }}
                      tickCount={4}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#6A953F"
                      fill="#6A953F"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Tooltip content={<RadarTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>

                {/* Skill breakdown list */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#555",
                      marginBottom: 8,
                    }}
                  >
                    Skill Breakdown
                  </div>
                  {detail.radar.map((s, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            color: "#555",
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={s.full_name}
                        >
                          {s.full_name}
                        </span>
                        <span
                          style={{
                            color: kpiColor(s.score),
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {s.value}
                        </span>
                      </div>
                      <div
                        style={{
                          background: "#f0f0f0",
                          borderRadius: 4,
                          height: 5,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${s.score}%`,
                            height: "100%",
                            background: kpiColor(s.score),
                            borderRadius: 4,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Row 3: Domain KPI tiles ── */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1F4E79",
                marginBottom: 10,
              }}
            >
              Domain Performance Tiles
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {detail.domain_kpis.map((d, i) => (
                <div
                  key={i}
                  style={{
                    background: kpiColor(d.kpi) + "12",
                    border: `1.5px solid ${kpiColor(d.kpi)}44`,
                    borderLeft: `4px solid ${kpiColor(d.kpi)}`,
                    borderRadius: 8,
                    padding: "10px 16px",
                    minWidth: 130,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>
                    {d.domain}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: kpiColor(d.kpi),
                    }}
                  >
                    {d.kpi}
                  </div>
                  <div style={{ fontSize: 10, color: kpiColor(d.kpi) }}>
                    {kpiLabel(d.kpi)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─── Main ViewEmployee ─────────────────────────────────────────────────────────
const ViewEmployee = () => {
  const [form] = Form.useForm();

  const [filteredEmps, setFilteredEmps] = useState([]);
  const [empListLoading, setEmpListLoading] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  // KPI detail modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  const fetchByRole = async (role) => {
    setEmpListLoading(true);
    try {
      const res = await axios.post("employee/by-role", { role });
      setFilteredEmps(res.data.employees || []);
    } catch {
      setFilteredEmps([]);
    }
    setEmpListLoading(false);
  };

  const handleRoleChange = (role) => {
    form.setFieldValue("empId", undefined);
    setData(null);
    setError(null);
    setSelectedRole(role || null);
    if (!role) {
      setFilteredEmps([]);
      return;
    }
    fetchByRole(role);
  };

  const columns = [
    {
      title: <span className="text-emerald-700 font-semibold">Name</span>,
      dataIndex: "Name",
      key: "name",
      render: (text) => (
        <span className="flex items-center gap-2">
          <UserOutlined className="text-emerald-600" />
          {text || "—"}
        </span>
      ),
    },
    {
      title: <span className="text-emerald-700 font-semibold">Home Town</span>,
      dataIndex: "Home Town",
      key: "home_town",
      render: (text) => text || "—",
    },
    {
      title: <span className="text-emerald-700 font-semibold">Age</span>,
      dataIndex: "Age",
      key: "age",
      render: (val) => val || "—",
    },
    {
      title: <span className="text-emerald-700 font-semibold">Domain</span>,
      dataIndex: "Domain",
      key: "domain",
      render: (text) => (
        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
          {text}
        </span>
      ),
    },
    {
      title: <span className="text-emerald-700 font-semibold">KPI Value</span>,
      dataIndex: "KPI",
      key: "kpi",
      render: (value, record) => {
        const score = parseFloat(value).toFixed(1);
        const percentage = Math.min(100, parseFloat(score));
        const color = kpiColor(percentage);
        const label = kpiLabel(percentage);
        return (
          <div
            style={{ cursor: "pointer" }}
            title="Click to view KPI details"
            onClick={() => setModalOpen(true)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  background: "#f0f0f0",
                  borderRadius: 6,
                  height: 8,
                  maxWidth: 90,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    background: color,
                    borderRadius: 6,
                    transition: "width 0.4s",
                  }}
                />
              </div>
              <span style={{ fontWeight: 700, color, minWidth: 36 }}>
                {score}
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: color + "18",
                  border: `1px solid ${color}44`,
                  color,
                  borderRadius: 10,
                  padding: "1px 7px",
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
              <RiseOutlined
                style={{ color: "#6A953F", fontSize: 12, opacity: 0.6 }}
                title="Click for details"
              />
            </div>
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
              Click to view breakdown
            </div>
          </div>
        );
      },
    },
  ];

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    setData(null);
    // Store the selected emp_id so the KPI detail modal can use it
    setSelectedEmpId(values.empId);
    try {
      const res = await axios.post("kpi/employee", {
        role: values.role,
        emp_id: values.empId,
      });
      setData(res.data.kpis);
    } catch {
      setError(
        "Error fetching data. Please check the selection and try again."
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <SearchOutlined className="text-3xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">View Employee</h1>
          </div>
        </div>

        {/* Search Form */}
        <Card
          className="mb-6 border-2 border-emerald-200 shadow-md"
          title={
            <div className="flex items-center gap-2">
              <TeamOutlined className="text-emerald-600" />
              <span className="text-lg font-semibold text-emerald-800">
                Search Employee
              </span>
            </div>
          }
        >
          <Form form={form} onFinish={onFinish} layout="vertical">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item
                name="role"
                label={
                  <span className="text-emerald-700 font-medium">Job Role</span>
                }
                rules={[
                  { required: true, message: "Please select a job role" },
                ]}
              >
                <Select
                  placeholder="-- Select a Role --"
                  allowClear
                  size="large"
                  suffixIcon={<TeamOutlined className="text-emerald-500" />}
                  onChange={handleRoleChange}
                >
                  {ROLES.map((r) => (
                    <Option key={r} value={r}>
                      {r}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="empId"
                label={
                  <span className="text-emerald-700 font-medium">Employee</span>
                }
                rules={[
                  { required: true, message: "Please select an employee" },
                ]}
              >
                <Select
                  placeholder={
                    empListLoading
                      ? "Loading..."
                      : filteredEmps.length === 0
                      ? "Select a role first"
                      : "-- Select an Employee --"
                  }
                  allowClear
                  size="large"
                  showSearch
                  optionFilterProp="children"
                  disabled={filteredEmps.length === 0}
                  suffixIcon={
                    empListLoading ? (
                      <Spin
                        indicator={
                          <LoadingOutlined style={{ fontSize: 14 }} spin />
                        }
                      />
                    ) : (
                      <IdcardOutlined className="text-emerald-500" />
                    )
                  }
                >
                  {filteredEmps.map((e) => (
                    <Option key={e.emp_id} value={e.emp_id}>
                      {e.display}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label={<span className="opacity-0">Button</span>}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  className="w-full"
                  icon={<SearchOutlined />}
                >
                  Search Employee
                </Button>
              </Form.Item>
            </div>
            {filteredEmps.length > 0 && (
              <div className="text-sm text-emerald-600 -mt-2">
                {filteredEmps.length} employee
                {filteredEmps.length !== 1 ? "s" : ""} found for selected role
              </div>
            )}
          </Form>
        </Card>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* Results Table */}
        <Card
          className="border-2 border-emerald-200 shadow-md"
          title={
            <div className="flex items-center gap-2">
              <UserOutlined className="text-emerald-600" />
              <span className="text-lg font-semibold text-emerald-800">
                Employee Details
              </span>
              {data && (
                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                  {data.length} record{data.length !== 1 ? "s" : ""}
                </span>
              )}
              {data && (
                <span className="ml-1 text-xs text-emerald-500 font-normal">
                  · Click any KPI value for detailed breakdown
                </span>
              )}
            </div>
          }
        >
          <Table
            columns={columns}
            dataSource={data}
            loading={loading}
            rowKey={(_, i) => i}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => (
                <span className="text-emerald-700 font-medium">
                  Total {total} record(s)
                </span>
              ),
            }}
            locale={{
              emptyText: (
                <div className="py-12">
                  <div className="text-6xl text-emerald-300 mb-3">🔍</div>
                  <p className="text-lg text-emerald-600 font-medium">
                    No employee data found
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Select a role and employee above, then click Search
                  </p>
                </div>
              ),
            }}
          />
        </Card>
      </div>

      {/* KPI Detail Modal */}
      <KpiDetailModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEmpId(null);
        }}
        empId={selectedEmpId}
        role={selectedRole}
      />

      <style jsx>{`
        :global(.ant-select-selector) {
          border-color: #d1fae5 !important;
        }
        :global(.ant-select-selector:hover) {
          border-color: #10b981 !important;
        }
        :global(.ant-select-focused .ant-select-selector) {
          border-color: #059669 !important;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1) !important;
        }
        :global(.ant-card-head) {
          background: linear-gradient(to right, #d1fae5, #a7f3d0);
          border-bottom: 2px solid #10b981;
        }
        :global(.ant-table-thead > tr > th) {
          background: #d1fae5 !important;
          border-bottom: 2px solid #10b981 !important;
        }
        :global(.ant-table-tbody > tr:hover > td) {
          background: #f0fdf4 !important;
        }
        :global(.ant-btn-primary) {
          background-color: #059669 !important;
          border-color: #059669 !important;
        }
        :global(.ant-btn-primary:hover) {
          background-color: #047857 !important;
          border-color: #047857 !important;
        }
      `}</style>
    </div>
  );
};

export default ViewEmployee;
