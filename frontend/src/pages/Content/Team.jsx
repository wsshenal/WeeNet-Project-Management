import React, { useEffect, useState } from "react";
import {
  Table, Select, Card, Row, Col, Form, Button, Spin, Tag,
  Divider, Statistic, Empty, Tooltip, Progress,
} from "antd";
import {
  TeamOutlined, ProjectOutlined, SearchOutlined, UserOutlined,
  DollarOutlined, AppstoreOutlined, CheckCircleOutlined,
  ClockCircleOutlined, LaptopOutlined, CloudServerOutlined,
  ToolOutlined, SafetyCertificateOutlined, DesktopOutlined,
} from "@ant-design/icons";
import axios from "../../apis/axiosInstance";

const { Option } = Select;

// Green color palette
const colors = {
  primary: "#6A953F",
  secondary: "#96BD68",
  light: "#B0D287",
  dark: "#4D6F2F",
  background: "#f0f5eb",
};

// ── Resource allocation logic ─────────────────────────────────────────────────
// Unit costs in USD
const RESOURCE_COSTS = {
  "Developer Laptop": { unitCost: 1400, icon: <LaptopOutlined /> },
  "Testing Machine": { unitCost: 900, icon: <DesktopOutlined /> },
  "CI/CD Server (Virtual)": { unitCost: 200, icon: <CloudServerOutlined /> },
  "Dev Tools License/yr": { unitCost: 600, icon: <ToolOutlined /> },
  "PM Software License/yr": { unitCost: 300, icon: <SafetyCertificateOutlined /> },
};

const DEVELOPER_ROLES = [
  "Backend Engineer", "Frontend Engineer", "FullStack Engineer", "Tech Lead",
];
const QA_ROLES = ["Quality Assurance Engineer"];
const DEVOPS_ROLES = ["DevOps Engineer"];
const PM_BA_ROLES = ["Project Manager", "Business Analyst"];

function computeHardwareResources(teamData) {
  let devCount = 0;
  let qaCount = 0;
  let devopsCount = 0;
  let pmBaCount = 0;

  teamData.forEach(({ role, count }) => {
    if (DEVELOPER_ROLES.includes(role)) devCount += count;
    if (QA_ROLES.includes(role)) qaCount += count;
    if (DEVOPS_ROLES.includes(role)) devopsCount += count;
    if (PM_BA_ROLES.includes(role)) pmBaCount += count;
  });

  const resources = [
    { name: "Developer Laptop", count: devCount + devopsCount, ...RESOURCE_COSTS["Developer Laptop"] },
    { name: "Testing Machine", count: qaCount + 1, ...RESOURCE_COSTS["Testing Machine"] },
    { name: "CI/CD Server (Virtual)", count: Math.max(devopsCount, 1), ...RESOURCE_COSTS["CI/CD Server (Virtual)"] },
    { name: "Dev Tools License/yr", count: devCount + qaCount, ...RESOURCE_COSTS["Dev Tools License/yr"] },
    { name: "PM Software License/yr", count: pmBaCount, ...RESOURCE_COSTS["PM Software License/yr"] },
  ].filter(r => r.count > 0).map(r => ({ ...r, total: r.count * r.unitCost }));

  return resources;
}

// ── Team columns ──────────────────────────────────────────────────────────────
const teamColumns = [
  {
    title: "Role",
    dataIndex: "role",
    key: "role",
    render: (text) => (
      <span style={{ fontWeight: 500, color: colors.dark }}>
        <UserOutlined style={{ marginRight: 8 }} />
        {text}
      </span>
    ),
  },
  {
    title: "Team Members Needed",
    dataIndex: "count",
    key: "count",
    render: (count) => (
      <Tag
        color={count > 2 ? "orange" : count > 1 ? "blue" : "green"}
        style={{ fontSize: 14, padding: "4px 12px" }}
      >
        {count} {count === 1 ? "member" : "members"}
      </Tag>
    ),
  },
];

// ── Resource allocation table columns ─────────────────────────────────────────
const resourceColumns = [
  {
    title: "Resource",
    dataIndex: "name",
    key: "name",
    render: (text, record) => (
      <span style={{ fontWeight: 500, color: colors.dark }}>
        <span style={{ marginRight: 8, color: colors.primary }}>{record.icon}</span>
        {text}
      </span>
    ),
  },
  {
    title: "Quantity",
    dataIndex: "count",
    key: "count",
    render: (count) => (
      <Tag color="blue" style={{ fontSize: 13, padding: "3px 10px" }}>
        × {count}
      </Tag>
    ),
  },
  {
    title: "Unit Cost (USD)",
    dataIndex: "unitCost",
    key: "unitCost",
    render: (val) => <span style={{ color: "#555" }}>${val.toLocaleString()}</span>,
  },
  {
    title: "Total Cost (USD)",
    dataIndex: "total",
    key: "total",
    render: (val) => (
      <span style={{ fontWeight: 600, color: colors.dark }}>
        ${val.toLocaleString()}
      </span>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const Team = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);
  const [totalTeamSize, setTotalTeamSize] = useState(0);
  const [hardware, setHardware] = useState([]);
  const [totalHwCost, setTotalHwCost] = useState(0);

  useEffect(() => {
    const getProjects = async () => {
      try {
        const res = await axios.get("/get-projects");
        localStorage.setItem("projects", JSON.stringify(res.data));
        const available = res.data?.filter((p) => p.status === 1 || p.status === 2);
        setProjects(available || []);
      } catch (e) {
        console.error("Error fetching projects:", e);
      }
    };
    getProjects();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    setData([]);
    setHardware([]);

    const projectsData = localStorage.getItem("projects");
    const parsedProjects = JSON.parse(projectsData) || [];
    const selectedProj = parsedProjects.find((p) => p.Name === values.projectName);

    if (selectedProj) {
      setProjectInfo({
        name: selectedProj.Name,
        domain: selectedProj.Domain,
        teamSize: selectedProj.Expected_Team_Size,
        budget: selectedProj.Expected_Budget,
        techStack: selectedProj.Tech_Stack,
        scope: selectedProj.project_scope,
        experience: selectedProj.team_experience,
        status: selectedProj.status,
      });

      try {
        const res = await axios.post("complexity", {
          Domain: selectedProj.Domain,
          "ML Components": selectedProj.ML_Components,
          Backend: selectedProj.Backend,
          Frontend: selectedProj.Frontend,
          "Core Features": selectedProj.Core_Features,
          "Tech Stack": selectedProj.Tech_Stack,
          Mobile: selectedProj.Mobile,
          Desktop: selectedProj.Desktop,
          Web: selectedProj.Web,
          IoT: selectedProj.IoT,
          "Expected Team Size": selectedProj.Expected_Team_Size,
          "Expected Budget": selectedProj.Expected_Budget,
          "Project Scope": selectedProj.project_scope,
          "Requirement specifity": selectedProj.requirement_specifity,
          "Team Experience": selectedProj.team_experience,
        });

        const formattedData = Object.keys(res.data.selected_team).map((role) => ({
          role,
          count: res.data.selected_team[role],
        }));

        const total = formattedData.reduce((s, i) => s + i.count, 0);
        setTotalTeamSize(total);
        setData(formattedData);

        // Compute hardware resources
        const hw = computeHardwareResources(formattedData);
        const hwTotal = hw.reduce((s, r) => s + r.total, 0);
        setHardware(hw);
        setTotalHwCost(hwTotal);

        // Persist workflow state
        const workflowKey = `workflow_${selectedProj.Name}`;
        const existing = localStorage.getItem(workflowKey);
        const wf = existing ? JSON.parse(existing) : {
          requirementComplete: true, teamComplete: false,
          complexityComplete: false, sdlcComplete: false,
        };
        wf.teamComplete = true;
        wf.teamData = { totalMembers: total, roles: formattedData.length, team: formattedData };
        localStorage.setItem(workflowKey, JSON.stringify(wf));

      } catch (e) {
        setError("Error fetching team data");
        console.error("Error:", e);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
      setError("Project not found");
    }
  };

  const getStatusTag = (status) => {
    if (status === 1) return <Tag icon={<CheckCircleOutlined />} color="success">Approved</Tag>;
    if (status === 2) return <Tag icon={<ClockCircleOutlined />} color="processing">Pending</Tag>;
    return <Tag color="default">Unknown</Tag>;
  };

  // Percentage of hw cost vs project budget
  const hwPercent = projectInfo?.budget
    ? Math.min(Math.round((totalHwCost / projectInfo.budget) * 100), 100)
    : 0;

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", padding: "24px" }}>

      {/* ── Header ── */}
      <Card style={{ marginBottom: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <div className="flex items-center gap-3">
          <TeamOutlined style={{ fontSize: 32, color: colors.primary }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: colors.dark }}>Team & Resource Allocation</h1>
            <p style={{ margin: 0, color: "#666" }}>
              Select a project to view the recommended team structure and hardware requirements
            </p>
          </div>
        </div>
      </Card>

      {/* ── Project Selector ── */}
      <Card
        title={<span style={{ color: colors.dark }}><ProjectOutlined style={{ marginRight: 8 }} />Select Project</span>}
        style={{ marginBottom: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
      >
        <Form form={form} name="team-form" onFinish={onFinish} layout="vertical">
          <Row gutter={24} align="middle">
            <Col xs={24} md={16}>
              <Form.Item
                name="projectName"
                label={<span style={{ fontWeight: 500 }}>Project Name</span>}
                rules={[{ required: true, message: "Please select a project" }]}
              >
                <Select placeholder="-- Select a Project --" allowClear size="large"
                  showSearch optionFilterProp="children" style={{ width: "100%" }}>
                  {projects.map((p) => (
                    <Option key={p.Name} value={p.Name}>{p.Name} — {p.Domain}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label=" ">
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />} size="large"
                  loading={loading}
                  style={{ background: colors.primary, borderColor: colors.primary, width: "100%" }}>
                  Analyze Project
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* ── Project Info ── */}
      {projectInfo && (
        <Card
          title={<span style={{ color: colors.dark }}><AppstoreOutlined style={{ marginRight: 8 }} />Project Details</span>}
          style={{ marginBottom: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          extra={getStatusTag(projectInfo.status)}
        >
          <Row gutter={[24, 16]}>
            {[
              { label: "Project Name", value: projectInfo.name, wide: true },
              { label: "Domain", value: projectInfo.domain },
              { label: "Scope", value: projectInfo.scope || "N/A" },
              { label: "Experience", value: projectInfo.experience || "N/A" },
              { label: "Budget (USD)", value: `$${projectInfo.budget?.toLocaleString()}` },
            ].map(({ label, value, wide }) => (
              <Col key={label} xs={24} md={wide ? 8 : 4}>
                <Card size="small" style={{ background: colors.background, borderColor: colors.light, borderRadius: 8 }}>
                  <Statistic
                    title={<span style={{ color: colors.dark }}>{label}</span>}
                    value={value}
                    valueStyle={{ fontSize: wide ? 18 : 15, color: colors.primary }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
          {projectInfo.techStack && (
            <div style={{ marginTop: 16 }}>
              <span style={{ fontWeight: 500, color: colors.dark }}>Tech Stack: </span>
              <Tag color={colors.primary}>{projectInfo.techStack}</Tag>
            </div>
          )}
        </Card>
      )}

      {/* ── Results ── */}
      {loading ? (
        <Card style={{ borderRadius: 12, textAlign: "center", padding: 48 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: "#666" }}>Analyzing team & resource requirements…</p>
        </Card>
      ) : error ? (
        <Card style={{ borderRadius: 12 }}>
          <div style={{ color: "red", textAlign: "center" }}>{error}</div>
        </Card>
      ) : data.length > 0 ? (
        <>
          {/* ── Team Structure ── */}
          <Card
            title={<span style={{ color: colors.dark }}><TeamOutlined style={{ marginRight: 8 }} />Recommended Team Structure</span>}
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", marginBottom: 24 }}
            extra={
              <Tag color={colors.primary} style={{ fontSize: 14, padding: "4px 12px" }}>
                Total: {totalTeamSize} members
              </Tag>
            }
          >
            <Table columns={teamColumns} dataSource={data} rowKey="role"
              pagination={false} style={{ marginBottom: 16 }} />
            <Card size="small"
              style={{
                background: `linear-gradient(135deg, ${colors.light} 0%, ${colors.background} 100%)`,
                borderColor: colors.secondary, borderRadius: 8
              }}>
              <div className="flex items-center gap-4">
                <TeamOutlined style={{ fontSize: 24, color: colors.dark }} />
                <div>
                  <div style={{ fontWeight: 600, color: colors.dark, fontSize: 16 }}>Team Summary</div>
                  <div style={{ color: "#666" }}>
                    You need <strong>{totalTeamSize} members</strong> across <strong>{data.length} roles</strong>.
                  </div>
                </div>
              </div>
            </Card>
          </Card>

          {/* ── Hardware Resource Allocation ── */}
          <Card
            title={
              <span style={{ color: colors.dark }}>
                <LaptopOutlined style={{ marginRight: 8 }} />
                Hardware Resource Allocation
              </span>
            }
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            extra={
              <Tag color="purple" style={{ fontSize: 14, padding: "4px 12px" }}>
                Est. Total: ${totalHwCost.toLocaleString()}
              </Tag>
            }
          >
            <Table
              columns={resourceColumns}
              dataSource={hardware}
              rowKey="name"
              pagination={false}
              style={{ marginBottom: 24 }}
              summary={() => (
                <Table.Summary.Row style={{ background: colors.background }}>
                  <Table.Summary.Cell colSpan={3}>
                    <span style={{ fontWeight: 700, color: colors.dark }}>Total Hardware Budget</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell>
                    <span style={{ fontWeight: 700, fontSize: 16, color: colors.dark }}>
                      ${totalHwCost.toLocaleString()}
                    </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />

            <Divider />

            {/* Visual breakdown */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: colors.dark }}>Resource Distribution</span>
            </div>
            {hardware.map((r) => {
              const pct = Math.round((r.total / totalHwCost) * 100);
              return (
                <div key={r.name} style={{ marginBottom: 12 }}>
                  <div className="flex justify-between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#555" }}>
                      {r.icon}&nbsp; {r.name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: colors.dark }}>
                      ${r.total.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <Progress
                    percent={pct}
                    showInfo={false}
                    strokeColor={colors.primary}
                    trailColor={colors.background}
                    size="small"
                  />
                </div>
              );
            })}

            {/* Budget vs project budget */}
            {projectInfo?.budget && (
              <Card size="small" style={{
                marginTop: 24, background: hwPercent > 30 ? "#fff7e6" : colors.background,
                borderColor: hwPercent > 30 ? "#ffc069" : colors.light, borderRadius: 8,
              }}>
                <Row gutter={24} align="middle">
                  <Col xs={24} md={12}>
                    <div style={{ color: colors.dark, fontWeight: 500, marginBottom: 6 }}>
                      Hardware Cost vs. Project Budget
                    </div>
                    <Progress
                      percent={hwPercent}
                      strokeColor={hwPercent > 30 ? "#fa8c16" : colors.primary}
                      format={(p) => `${p}%`}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Statistic
                          title={<span style={{ color: "#888" }}>Hardware Cost</span>}
                          value={totalHwCost}
                          prefix="$"
                          valueStyle={{ color: colors.dark, fontSize: 18 }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={<span style={{ color: "#888" }}>Project Budget</span>}
                          value={projectInfo.budget}
                          prefix="$"
                          valueStyle={{ color: colors.primary, fontSize: 18 }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card>
            )}
          </Card>
        </>
      ) : !projectInfo ? (
        <Card style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: "#666" }}>Select a project above to view team composition and resource allocation</span>}
          />
        </Card>
      ) : null}
    </div>
  );
};

export default Team;
