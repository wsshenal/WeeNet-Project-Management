import React, { useEffect, useState } from "react";
import {
  Table, Select, Card, Row, Col, Form, Button, Spin, Tag,
  Divider, Statistic, Empty, Progress, Alert, Tooltip,
} from "antd";
import {
  TeamOutlined, ProjectOutlined, SearchOutlined, UserOutlined,
  DollarOutlined, AppstoreOutlined, CheckCircleOutlined,
  ClockCircleOutlined, LaptopOutlined, CloudServerOutlined,
  ToolOutlined, SafetyCertificateOutlined, DesktopOutlined,
  DownloadOutlined, ThunderboltOutlined, WarningOutlined,
  CodeOutlined, ExperimentOutlined, NodeIndexOutlined, DiffOutlined,
  RocketOutlined, RightOutlined,
} from "@ant-design/icons";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from "recharts";
import axios from "../../apis/axiosInstance";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";

const { Option } = Select;

// Green color palette matching SDLC
const colors = {
  primary: "#6A953F",
  secondary: "#96BD68",
  light: "#B0D287",
  dark: "#4D6F2F",
  background: "#f0f5eb",
  dev: "#4D6F2F",     // Dark Green
  qa: "#1890ff",      // Blue
  devops: "#fa8c16",  // Orange
  pm: "#722ed1",      // Purple
};

// ── Role Mapping & Cost Logic (Accurate Monthly Rates in USD) ──
const ROLE_CATEGORIES = {
  "Backend Engineer": { category: "Development", color: colors.dev, icon: <CodeOutlined />, monthlySalary: 8500 },
  "Frontend Engineer": { category: "Development", color: colors.dev, icon: <CodeOutlined />, monthlySalary: 8000 },
  "FullStack Engineer": { category: "Development", color: colors.dev, icon: <CodeOutlined />, monthlySalary: 9500 },
  "Tech Lead": { category: "Development", color: colors.dev, icon: <CodeOutlined />, monthlySalary: 12000 },
  "Quality Assurance Engineer": { category: "QA", color: colors.qa, icon: <ExperimentOutlined />, monthlySalary: 6500 },
  "DevOps Engineer": { category: "DevOps", color: colors.devops, icon: <NodeIndexOutlined />, monthlySalary: 9000 },
  "Project Manager": { category: "Management", color: colors.pm, icon: <DiffOutlined />, monthlySalary: 10000 },
  "Business Analyst": { category: "Management", color: colors.pm, icon: <DiffOutlined />, monthlySalary: 7500 },
};

// One-time Hardware/Software Setup Costs (CapEx)
const RESOURCE_COSTS = {
  "High-End Developer Laptop": { unitCost: 2500, icon: <LaptopOutlined />, type: "Hardware" },
  "Standard Laptop (QA/PM)": { unitCost: 1500, icon: <DesktopOutlined />, type: "Hardware" },
  "Cloud Environment Setup (AWS/GCP)": { unitCost: 1200, icon: <CloudServerOutlined />, type: "Infrastructure" },
  "Pro Dev Tools (IDE, Copilot) / yr": { unitCost: 400, icon: <ToolOutlined />, type: "Software" },
  "Enterprise PM Suite (Jira/Confluence) / yr": { unitCost: 350, icon: <SafetyCertificateOutlined />, type: "Software" },
};

function computeAllocationsAndCosts(teamData, experienceLevel) {
  let categoryCounts = { "Development": 0, "QA": 0, "DevOps": 0, "Management": 0 };
  let totalMonthlySalary = 0;

  // Experience multiplier for salaries
  const expMultiplier = experienceLevel === "High" ? 1.25 : experienceLevel === "Low" ? 0.8 : 1.0;

  const enrichedTeam = teamData.map(({ role, count }) => {
    const meta = ROLE_CATEGORIES[role] || { category: "Other", color: "#888", icon: <UserOutlined />, monthlySalary: 7000 };
    if (categoryCounts[meta.category] !== undefined) {
      categoryCounts[meta.category] += count;
    }
    const adjustedSalary = Math.round(meta.monthlySalary * expMultiplier);
    const rowCost = count * adjustedSalary;
    totalMonthlySalary += rowCost;
    return { role, count, ...meta, adjustedSalary, totalMonthlyCost: rowCost };
  });

  const { Development: dev, QA: qa, DevOps: devops, Management: pm } = categoryCounts;

  const resources = [
    { name: "High-End Developer Laptop", count: dev + devops, ...RESOURCE_COSTS["High-End Developer Laptop"] },
    { name: "Standard Laptop (QA/PM)", count: qa + pm, ...RESOURCE_COSTS["Standard Laptop (QA/PM)"] },
    { name: "Cloud Environment Setup (AWS/GCP)", count: 1, ...RESOURCE_COSTS["Cloud Environment Setup (AWS/GCP)"] }, // Base infrastructure
    { name: "Pro Dev Tools (IDE, Copilot) / yr", count: dev + devops, ...RESOURCE_COSTS["Pro Dev Tools (IDE, Copilot) / yr"] },
    { name: "Enterprise PM Suite (Jira/Confluence) / yr", count: dev + qa + devops + pm, ...RESOURCE_COSTS["Enterprise PM Suite (Jira/Confluence) / yr"] },
  ].filter(r => r.count > 0).map(r => ({ ...r, total: r.count * r.unitCost }));

  const totalOpEx = totalMonthlySalary;
  const totalCapEx = resources.reduce((s, r) => s + r.total, 0);

  // Chart data formatting
  const pieData = Object.entries(categoryCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => {
      const color = name === "Development" ? colors.dev : name === "QA" ? colors.qa : name === "DevOps" ? colors.devops : colors.pm;
      return { name, value, color };
    });

  const barData = resources.map(r => ({
    name: r.name.split(" ")[0] + " " + r.name.split(" ")[1].replace(/[()]/g, ""),
    Cost: r.total,
    Quantity: r.count
  }));

  return { enrichedTeam, categoryCounts, resources, totalOpEx, totalCapEx, pieData, barData };
}

// ── Component ─────────────────────────────────────────────────────────────────
const Team = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);

  const [teamData, setTeamData] = useState([]);
  const [resourceData, setResourceData] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(null);

  useEffect(() => {
    const getProjects = async () => {
      try {
        const res = await axios.get("/get-projects");
        localStorage.setItem("projects", JSON.stringify(res.data));
        setProjects(res.data?.filter((p) => p.status === 1 || p.status === 2) || []);
      } catch (e) {
        console.error("Error fetching projects:", e);
      }
    };
    getProjects();
  }, []);

  const exportToPDF = () => {
    const input = document.getElementById("team-content");
    if (input) {
      document.body.style.cursor = 'wait';
      html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        pdf.save(`${projectInfo?.name || 'Project'}_Team_Allocation.pdf`);
        document.body.style.cursor = 'default';
      });
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    const parsedProjects = JSON.parse(localStorage.getItem("projects")) || [];
    const selectedProj = parsedProjects.find((p) => p.Name === values.projectName);

    if (selectedProj) {
      setProjectInfo({
        name: selectedProj.Name, domain: selectedProj.Domain,
        budget: selectedProj.Expected_Budget, techStack: selectedProj.Tech_Stack,
        experience: selectedProj.team_experience, status: selectedProj.status,
      });

      try {
        const res = await axios.post("complexity", {
          Domain: selectedProj.Domain, "ML Components": selectedProj.ML_Components,
          Backend: selectedProj.Backend, Frontend: selectedProj.Frontend,
          "Core Features": selectedProj.Core_Features, "Tech Stack": selectedProj.Tech_Stack,
          Mobile: selectedProj.Mobile, Desktop: selectedProj.Desktop,
          Web: selectedProj.Web, IoT: selectedProj.IoT,
          "Expected Team Size": selectedProj.Expected_Team_Size,
          "Expected Budget": selectedProj.Expected_Budget,
          "Project Scope": selectedProj.project_scope,
          "Requirement specifity": selectedProj.requirement_specifity,
          "Team Experience": selectedProj.team_experience,
        });

        const rawTeam = Object.keys(res.data.selected_team).map((role) => ({
          role, count: res.data.selected_team[role],
        }));

        const results = computeAllocationsAndCosts(rawTeam, selectedProj.team_experience);
        setTeamData(results.enrichedTeam);
        setResourceData(results.resources);
        setAnalytics(results);

        // Update workflow
        const workflowKey = `workflow_${selectedProj.Name}`;
        const wf = JSON.parse(localStorage.getItem(workflowKey)) || { requirementComplete: true };
        wf.teamComplete = true;
        localStorage.setItem(workflowKey, JSON.stringify(wf));
        setWorkflowStatus(wf);

      } catch (e) {
        console.error("Error formatting team data:", e);
      } finally {
        setLoading(false);
      }
    }
  };

  // ── Columns ──
  const teamColumns = [
    {
      title: "Role & Category", dataIndex: "role", key: "role",
      render: (text, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 4, height: 24, background: record.color, borderRadius: 2 }} />
          <span style={{ color: record.color, fontSize: 16 }}>{record.icon}</span>
          <div>
            <div style={{ fontWeight: 600, color: colors.dark }}>{text}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{record.category}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Headcount", dataIndex: "count", key: "count", align: "center",
      render: (count) => (
        <Tag color={count > 2 ? "purple" : count > 1 ? "blue" : "green"} style={{ fontSize: 14, padding: "4px 12px", borderRadius: 12 }}>
          {count} {count === 1 ? "member" : "members"}
        </Tag>
      ),
    },
    {
      title: "Est. Monthly Salary (ea)", dataIndex: "adjustedSalary", key: "adjustedSalary", align: "right",
      render: (val) => <span style={{ color: "#555" }}>${val.toLocaleString()}</span>,
    },
    {
      title: "Total Monthly OpEx", dataIndex: "totalMonthlyCost", key: "totalMonthlyCost", align: "right",
      render: (val) => <span style={{ fontWeight: 600, color: colors.dark }}>${val.toLocaleString()}</span>,
    },
  ];

  const resourceColumns = [
    {
      title: "Resource Asset", dataIndex: "name", key: "name",
      render: (text, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: record.type === "Hardware" ? colors.primary : record.type === "Software" ? colors.devops : colors.qa, fontSize: 18 }}>
            {record.icon}
          </span>
          <div>
            <div style={{ fontWeight: 500, color: colors.dark }}>{text}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{record.type} (One-time/Annual CapEx)</div>
          </div>
        </div>
      ),
    },
    {
      title: "Qty Required", dataIndex: "count", key: "count", align: "center",
      render: (count) => <Tag color="blue" style={{ fontSize: 14, borderRadius: 12 }}>× {count}</Tag>,
    },
    {
      title: "Unit Cost", dataIndex: "unitCost", key: "unitCost", align: "right",
      render: (val) => <span style={{ color: "#555" }}>${val.toLocaleString()}</span>,
    },
    {
      title: "Capital Expense", dataIndex: "total", key: "total", align: "right",
      render: (val) => <span style={{ fontWeight: 600, color: colors.dark }}>${val.toLocaleString()}</span>,
    },
  ];

  // Calculations for budget analytical insights
  const runwayMonths = analytics && projectInfo?.budget ? (projectInfo.budget - analytics.totalCapEx) / analytics.totalOpEx : 0;
  const capexPercentage = analytics && projectInfo?.budget ? (analytics.totalCapEx / projectInfo.budget) * 100 : 0;

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", padding: "24px" }}>
      {/* ── Gradient Header ── */}
      <Card
        style={{
          marginBottom: 24, borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.primary} 100%)`,
          boxShadow: "0 4px 12px rgba(106, 149, 63, 0.2)",
        }}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <TeamOutlined style={{ fontSize: 40, color: "#fff" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 28, color: "#fff", fontWeight: 700 }}>Team & Resource Allocation</h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", fontSize: 15 }}>
                AI-optimized team structuring and financial forecasting
              </p>
            </div>
          </div>
          <Button
            onClick={exportToPDF} type="default" icon={<DownloadOutlined />} size="large"
            disabled={!analytics}
            style={{ borderRadius: 8, fontWeight: 500, color: colors.dark, border: "none" }}
          >
            Export Full Report
          </Button>
        </div>
      </Card>

      {/* ── Project Selection ── */}
      <Card
        title={<span style={{ color: colors.dark, fontSize: 16 }}><ProjectOutlined style={{ marginRight: 8 }} />Select Project for Allocation</span>}
        style={{ marginBottom: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Row gutter={24} align="middle">
            <Col xs={24} md={18}>
              <Form.Item name="projectName" rules={[{ required: true, message: "Select a project" }]} style={{ margin: 0 }}>
                <Select placeholder="-- Choose Project --" size="large" showSearch>
                  {projects.map((p) => <Option key={p.Name} value={p.Name}>{p.Name} — {p.Domain}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Button type="primary" htmlType="submit" loading={loading} size="large" block
                icon={<AppstoreOutlined />} style={{ background: colors.primary, borderRadius: 8 }}>
                Generate Allocation
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* ── Workflow Badges ── */}
      {workflowStatus && (
        <Card size="small" style={{ marginBottom: 24, borderRadius: 12, background: "#fff" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <span style={{ fontWeight: 600, color: colors.dark, marginRight: 8 }}>Planning Progress:</span>
            <Tag color="success" icon={<CheckCircleOutlined />}>Requirements</Tag>
            <RightOutlined style={{ color: '#ccc', fontSize: 10 }} />
            <Tag color="success" icon={<CheckCircleOutlined />}>Team Allocated</Tag>
            <RightOutlined style={{ color: '#ccc', fontSize: 10 }} />
            <Tag color={workflowStatus.sdlcComplete ? "success" : "default"} style={{ cursor: 'pointer' }} onClick={() => navigate('/sdlc')}>
              SDLC Tracking {workflowStatus.sdlcComplete ? "✓" : "Pending"}
            </Tag>
          </div>
        </Card>
      )}

      {/* ── Dashboard Content ── */}
      <div id="team-content" style={{ background: "#fafafa" }}>
        {loading ? (
          <Card style={{ margin: "40px 0", textAlign: "center", borderRadius: 12, padding: 60 }}>
            <Spin size="large" />
            <h3 style={{ marginTop: 24, color: colors.dark }}>Analyzing required technical capabilities...</h3>
            <p style={{ color: "#666" }}>Running resource allocation model.</p>
          </Card>
        ) : analytics ? (
          <>
            {/* Project Overview Ribbon */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px", overflowX: "auto" }}>
              <div style={{ flex: 1, minWidth: 200, background: "#fff", padding: "16px 20px", borderRadius: 12, borderLeft: `4px solid ${colors.primary}`, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Project</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.dark }}>{projectInfo.name}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, background: "#fff", padding: "16px 20px", borderRadius: 12, borderLeft: `4px solid ${colors.devops}`, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Budget</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.dark }}>${projectInfo.budget?.toLocaleString()}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, background: "#fff", padding: "16px 20px", borderRadius: 12, borderLeft: `4px solid ${colors.qa}`, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Team Exp. Requirement</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.dark }}>{projectInfo.experience} Level</div>
              </div>
            </div>

            {/* ── Row 1: Team Composition Chart + Stats ── */}
            <Row gutter={24} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={8}>
                <Card title="Team Composition" style={{ height: "100%", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.pieData} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                          {analytics.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value, name) => [`${value} Members`, name]} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: colors.dark }}>{analytics.enrichedTeam.reduce((a, b) => a + b.count, 0)}</div>
                    <div style={{ color: "#888", fontSize: 13, textTransform: "uppercase" }}>Total Headcount</div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={16}>
                <Card title="Detailed Team Roster" style={{ height: "100%", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
                  extra={<Tag color="green">Operational Expense (OpEx)</Tag>}>
                  <Table columns={teamColumns} dataSource={teamData} rowKey="role" pagination={false} size="middle"
                    summary={() => (
                      <Table.Summary.Row style={{ background: colors.background }}>
                        <Table.Summary.Cell colSpan={3}><span style={{ fontWeight: 700, color: colors.dark, float: "right" }}>Total Monthly Payroll:</span></Table.Summary.Cell>
                        <Table.Summary.Cell align="right"><span style={{ fontWeight: 800, fontSize: 16, color: colors.dark }}>${analytics.totalOpEx.toLocaleString()}</span></Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  />
                </Card>
              </Col>
            </Row>

            {/* ── Row 2: CapEx & Financial Burn Analytics ── */}
            <Row gutter={24} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={14}>
                <Card title="Hardware & Software Requirements" style={{ height: "100%", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
                  extra={<Tag color="purple">Capital Expense (CapEx)</Tag>}>
                  <Table columns={resourceColumns} dataSource={resourceData} rowKey="name" pagination={false} size="small"
                    summary={() => (
                      <Table.Summary.Row style={{ background: "#fff2e8" }}>
                        <Table.Summary.Cell colSpan={3}><span style={{ fontWeight: 700, color: colors.devops, float: "right" }}>Total Initial Setup Cost (CapEx):</span></Table.Summary.Cell>
                        <Table.Summary.Cell align="right"><span style={{ fontWeight: 800, fontSize: 16, color: colors.devops }}>${analytics.totalCapEx.toLocaleString()}</span></Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  />
                  <div style={{ height: 180, marginTop: 24 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => `$${v / 1000}k`} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                        <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                        <Bar dataKey="Cost" fill={colors.secondary} radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={10}>
                <Card title="Financial Burn & Runway Analysis" style={{ height: "100%", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

                  <div style={{ marginBottom: 24, padding: "20px", background: colors.background, borderRadius: 8, border: `1px solid ${colors.light}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                      <span style={{ color: "#666" }}>Total Budget:</span>
                      <strong style={{ fontSize: 16 }}>${projectInfo.budget?.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                      <span style={{ color: "#666" }}>Initial CapEx (Hardware/Software):</span>
                      <strong style={{ color: colors.devops }}>- ${analytics.totalCapEx.toLocaleString()}</strong>
                    </div>
                    <Divider style={{ margin: "12px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600, color: colors.dark }}>Remaining Operating Budget:</span>
                      <strong style={{ fontSize: 18, color: colors.primary }}>${(projectInfo.budget - analytics.totalCapEx).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: colors.dark }}>Estimated Runway</span>
                      <span style={{ fontWeight: 700, fontSize: 16, color: runwayMonths < 3 ? "#cf1322" : colors.primary }}>
                        {runwayMonths > 0 ? runwayMonths.toFixed(1) : 0} Months
                      </span>
                    </div>
                    <Progress
                      percent={Math.min(100, Math.max(0, (runwayMonths / 12) * 100))}
                      strokeColor={runwayMonths < 3 ? "#cf1322" : runwayMonths < 6 ? "#fa8c16" : colors.primary}
                      showInfo={false}
                      strokeWidth={12}
                    />
                    <div style={{ fontSize: 12, color: "#888", marginTop: 8, textAlign: "right" }}>
                      At a burn rate of ${analytics.totalOpEx.toLocaleString()}/month
                    </div>
                  </div>

                  {runwayMonths < 3 ? (
                    <Alert
                      showIcon icon={<WarningOutlined />} type="error"
                      message="Critically Short Runway"
                      description={`At this team size, the budget will exhaust in ${runwayMonths.toFixed(1)} months. Consider securing more budget or reducing headcount.`}
                    />
                  ) : runwayMonths < 6 ? (
                    <Alert
                      showIcon type="warning"
                      message="Tight Financial Runway"
                      description={`The team burn rate leaves a runway of under 6 months. Agile delivery is critical.`}
                    />
                  ) : (
                    <Alert
                      showIcon icon={<RocketOutlined />} type="success"
                      message="Healthy Project Runway"
                      description={`Sufficient budget for ${runwayMonths.toFixed(1)} months of operation with the current team structure.`}
                    />
                  )}

                  <div style={{ marginTop: 24, textAlign: "center" }}>
                    <Button type="primary" size="large" onClick={() => navigate('/sdlc')}
                      style={{ background: colors.dark, padding: "0 32px", height: 44, borderRadius: 8 }}>
                      Proceed to SDLC Tracking <RightOutlined />
                    </Button>
                  </div>

                </Card>
              </Col>
            </Row>
          </>
        ) : (
          <div style={{ padding: "40px 0" }}>
            <Empty description={<span style={{ color: "#666", fontSize: 16 }}>Select a project to generate a Team Allocation & Budgeting Report</span>} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Team;
