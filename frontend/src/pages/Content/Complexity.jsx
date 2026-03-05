import React, { useState, useEffect } from "react";
import { Button, Form, Table, Select, Spin, Card, Row, Col, Divider, Tag } from "antd";
import {
  SearchOutlined,
  ProjectOutlined,
  TeamOutlined,
  DollarOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import axios from "../../apis/axiosInstance";

const { Option } = Select;

// Green color palette (matching SDLC page)
const colors = {
  primary: "#6A953F",
  secondary: "#96BD68",
  light: "#B0D287",
  dark: "#4D6F2F",
  background: "#f0f5eb",
};

const columns = [
  {
    title: "Employee ID",
    dataIndex: "Emp ID",
    key: "empId",
  },
  {
    title: "KPI Value",
    dataIndex: "KPI",
    key: "kpi",
    render: (text) => parseFloat(text).toFixed(2),
  },
  {
    title: "Role",
    dataIndex: "Role",
    key: "role",
  },
];

const Complexity = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [projectInfo, setProjectInfo] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  // Fetch projects on component mount
  useEffect(() => {
    const getProjects = async () => {
      try {
        const res = await axios.get("/get-projects");
        localStorage.setItem("projects", JSON.stringify(res.data));
        // Filter to only show approved or pending projects
        const availableProjects = res.data?.filter((prj) => {
          return prj.status === 1 || prj.status === 2;
        });
        setProjects(availableProjects || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    getProjects();
  }, []);

  // Handle form submission
  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    setData(null);
    setTableData(null);

    const projectsData = localStorage.getItem("projects");
    const parsedProjects = JSON.parse(projectsData) || [];
    const selectedProj = parsedProjects.find((prj) => prj.Name === values.projectName);

    if (selectedProj) {
      setSelectedProject(selectedProj);
      
      // Store project info for display
      setProjectInfo({
        name: selectedProj.Name,
        domain: selectedProj.Domain,
        teamSize: selectedProj.Expected_Team_Size,
        budget: selectedProj.Expected_Budget,
        techStack: selectedProj.Tech_Stack,
        status: selectedProj.status,
      });

      // Save to localStorage for other pages
      localStorage.setItem("SearchPayload", JSON.stringify(selectedProj));

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

        setData(res.data);
        setTableData(res.data.selected_employees);

        // Save workflow status - Complexity analysis complete
        const workflowKey = `workflow_${selectedProj.Name}`;
        const existingWorkflow = localStorage.getItem(workflowKey);
        const workflowData = existingWorkflow ? JSON.parse(existingWorkflow) : {
          requirementComplete: true,
          teamComplete: false,
          complexityComplete: false,
          sdlcComplete: false,
        };
        workflowData.complexityComplete = true;
        workflowData.complexityData = {
          level: res.data.complexity_prediction,
          recommendedTeam: res.data.selected_employees?.length || 0,
        };
        localStorage.setItem(workflowKey, JSON.stringify(workflowData));

      } catch (error) {
        setError("Error fetching complexity data");
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
      setError("Project not found");
    }
  };

  // Get complexity color and tag
  const getComplexityStyle = (complexity) => {
    switch (complexity) {
      case "High":
        return { color: "#f5222d", bgColor: "#fff1f0", borderColor: "#ffa39e" };
      case "Medium":
        return { color: "#fa8c16", bgColor: "#fff7e6", borderColor: "#ffd591" };
      case "Low":
        return { color: "#52c41a", bgColor: "#f6ffed", borderColor: "#b7eb8f" };
      default:
        return { color: "#666", bgColor: "#fafafa", borderColor: "#d9d9d9" };
    }
  };

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", padding: "24px" }}>
      {/* Header Section */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <ThunderboltOutlined style={{ fontSize: 32, color: colors.primary }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: colors.dark }}>
              Complexity Analysis
            </h1>
            <p style={{ margin: 0, color: "#666" }}>
              Analyze project complexity and get recommended team members
            </p>
          </div>
        </div>
      </Card>

      {/* Project Selection Card */}
      <Card
        title={
          <span style={{ color: colors.dark }}>
            <ProjectOutlined style={{ marginRight: 8 }} />
            Select Project
          </span>
        }
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Form form={form} name="complexity-form" onFinish={onFinish} layout="vertical">
          <Row gutter={24} align="middle">
            <Col xs={24} md={16}>
              <Form.Item
                name="projectName"
                label={<span style={{ fontWeight: 500 }}>Project Name</span>}
                rules={[{ required: true, message: "Please select a project" }]}
              >
                <Select
                  placeholder="-- Select a Project --"
                  allowClear
                  size="large"
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="children"
                >
                  {projects.map((prj) => (
                    <Option key={prj.Name} value={prj.Name}>
                      {prj.Name} - {prj.Domain}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label=" ">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  block
                  icon={<SearchOutlined />}
                  style={{ background: colors.primary, borderColor: colors.primary }}
                >
                  Analyze Complexity
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Error Display */}
      {error && (
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 12,
            background: "#fff1f0",
            borderColor: "#ffa39e",
          }}
        >
          <div style={{ color: "#f5222d" }}>⚠️ {error}</div>
        </Card>
      )}

      {/* Results Section - Only show after analysis */}
      {(data || loading) && (
        <>
          {/* Project Details Card */}
          {projectInfo && (
            <Card
              title={
                <span style={{ color: colors.dark }}>
                  <AppstoreOutlined style={{ marginRight: 8 }} />
                  Project Details
                </span>
              }
              style={{
                marginBottom: 24,
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <Row gutter={[24, 16]}>
                <Col xs={12} md={6}>
                  <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                    Project Name
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {projectInfo.name}
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                    Domain
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {projectInfo.domain}
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                    <TeamOutlined /> Team Size
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {projectInfo.teamSize} members
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                    <DollarOutlined /> Budget
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    ${projectInfo.budget?.toLocaleString()}
                  </div>
                </Col>
              </Row>
              <Divider style={{ margin: "16px 0" }} />
              <Row gutter={[24, 16]}>
                <Col xs={12} md={12}>
                  <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                    Tech Stack
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    {projectInfo.techStack}
                  </div>
                </Col>
                <Col xs={12} md={12}>
                  <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                    Status
                  </div>
                  <Tag color={projectInfo.status === 1 ? "green" : "orange"}>
                    {projectInfo.status === 1 ? "Approved" : "Pending"}
                  </Tag>
                </Col>
              </Row>
            </Card>
          )}

          {/* Complexity Result Card */}
          <Card
            title={
              <span style={{ color: colors.dark }}>
                <ThunderboltOutlined style={{ marginRight: 8 }} />
                Complexity Result
              </span>
            }
            style={{
              marginBottom: 24,
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: "#666" }}>
                  Analyzing project complexity...
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ color: "#666", marginBottom: 8 }}>
                  Complexity Level for <strong>{projectInfo?.name}</strong>
                </div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "16px 48px",
                    borderRadius: 8,
                    fontSize: 32,
                    fontWeight: 700,
                    background: getComplexityStyle(data?.complexity).bgColor,
                    color: getComplexityStyle(data?.complexity).color,
                    border: `2px solid ${getComplexityStyle(data?.complexity).borderColor}`,
                  }}
                >
                  {data?.complexity || "N/A"}
                </div>
              </div>
            )}
          </Card>

          {/* Recommended Team Members Table */}
          <Card
            title={
              <span style={{ color: colors.dark }}>
                <TeamOutlined style={{ marginRight: 8 }} />
                Recommended Team Members
              </span>
            }
            style={{
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Table
              columns={columns}
              dataSource={tableData}
              loading={loading}
              rowKey={(record) => record["Emp ID"] || Math.random()}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      )}

      {/* Initial State - No project selected yet */}
      {!data && !loading && !error && (
        <Card
          style={{
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            textAlign: "center",
            padding: "40px",
          }}
        >
          <ProjectOutlined style={{ fontSize: 64, color: "#d9d9d9", marginBottom: 16 }} />
          <div style={{ color: "#666", fontSize: 16 }}>
            Select a project from the dropdown above to analyze its complexity
          </div>
        </Card>
      )}
    </div>
  );
};

export default Complexity;
