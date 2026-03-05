import React, { useEffect, useState } from "react";
import axios from "../../apis/axiosInstance";
import {
  Spin,
  Button,
  Modal,
  Form,
  Select,
  Tag,
  Card,
  Row,
  Col,
  Divider,
  Alert,
} from "antd";
import {
  SyncOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  RocketOutlined,
  TeamOutlined,
  DollarOutlined,
  ProjectOutlined,
  ThunderboltOutlined,

  WarningOutlined,
} from "@ant-design/icons";
// Recharts retained for possible future charts (Tooltip, etc.)
// Gantt chart is rendered as custom SVG/div — no extra library needed.
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Green color palette
const colors = {
  primary: "#6A953F",
  secondary: "#96BD68",
  light: "#B0D287",
  dark: "#4D6F2F",
  background: "#f0f5eb",
};

const SDLC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewPayloadModalVisible, setIsViewPayloadModalVisible] =
    useState(false);
  const [form] = Form.useForm();
  const [currentPayload, setCurrentPayload] = useState(null);
  const [projectName, setProjectName] = useState();
  const [pending, setPending] = useState();
  const [isPending, setIsPending] = useState(false);
  const [projectInfo, setProjectInfo] = useState(null);
  const [selectedProject, setSeletedProject] = useState({});
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [workflowWarning, setWorkflowWarning] = useState(null);

  const { Option } = Select;

  useEffect(() => {
    const getProjects = async () => {
      const res = await axios.get("/get-projects");
      localStorage.setItem("projects", JSON.stringify(res.data));
      const selectionProjects = res.data?.filter((prj) => {
        return prj.status === 1 || prj.status === 2;
      });
      setProjectName(selectionProjects);
      setPending(4);
    };
    getProjects();
  }, []);

  // const exportToPDF = () => {
  //   const input = document.getElementById("sdlc-content");
  //   if (input) {
  //     html2canvas(input).then((canvas) => {
  //       const imgData = canvas.toDataURL("image/png");
  //       const pdf = new jsPDF("p", "mm", "a4");
  //       const imgWidth = 210;
  //       const imgHeight = (canvas.height * imgWidth) / canvas.width;
  //       pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  //       pdf.save("sdlc-output.pdf");
  //     });
  //   } else {
  //     console.error("Input element for PDF generation not found.");
  //   }
  // };
  const exportToPDF = () => {
    const input = document.getElementById("sdlc-content");
    if (input) {
      html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 10, 10, imgWidth - 20, imgHeight - 20);
        pdf.save("sdlc-output.pdf");
      });
    } else {
      console.error("Input element for PDF generation not found.");
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    setPending(3);
    setWorkflowWarning(null);
    const projects = localStorage.getItem("projects");
    const parsedPrj = JSON.parse(projects) || [];
    const selectedProj = parsedPrj.filter((prj) => prj.Name === values.name);

    localStorage.setItem("SearchPayload", JSON.stringify(selectedProj[0]));

    const payload = selectedProj[0];
    setSeletedProject(payload);

    // Check workflow status - ensure Team and Complexity are done first
    const workflowKey = `workflow_${payload.Name}`;
    const existingWorkflow = localStorage.getItem(workflowKey);
    const workflow = existingWorkflow ? JSON.parse(existingWorkflow) : null;
    setWorkflowStatus(workflow);

    // Warn user if previous steps are not completed
    if (!workflow || !workflow.teamComplete || !workflow.complexityComplete) {
      const missingSteps = [];
      if (!workflow?.teamComplete) missingSteps.push("Team Allocation");
      if (!workflow?.complexityComplete) missingSteps.push("Complexity Analysis");

      setWorkflowWarning({
        message: "Recommended Steps Not Completed",
        description: `For accurate predictions, please complete: ${missingSteps.join(", ")}. The prediction will still run but may be less accurate without prior analysis.`,
        missingSteps,
      });
    }

    // Store project info for display
    setProjectInfo({
      name: payload.Name,
      domain: payload.Domain,
      teamSize: payload.Expected_Team_Size,
      budget: payload.Expected_Budget,
      techStack: payload.Tech_Stack,
      status: payload.status,
      scope: payload.project_scope,
      teamExperience: payload.team_experience,
    });

    if (payload) {
      try {
        const res = await axios.post("/sdlc", {
          Domain: payload.Domain,
          "ML Components": payload.ML_Components,
          Backend: payload.Backend,
          Frontend: payload.Frontend,
          "Core Features": payload.Core_Features,
          "Tech Stack": payload.Tech_Stack,
          Mobile: payload.Mobile,
          Desktop: payload.Desktop,
          Web: payload.Web,
          IoT: payload.IoT,
          "Expected Team Size": payload.Expected_Team_Size,
          "Expected Budget": payload.Expected_Budget,
          status: payload.status,
          "Project Scope": payload.project_scope,
          "Requirement specifity": payload.requirement_specifity,
          "Team Experience": payload.team_experience,
        });
        setData(res.data);

        // Save workflow status - SDLC prediction complete
        const updatedWorkflow = workflow || {
          requirementComplete: true,
          teamComplete: false,
          complexityComplete: false,
          sdlcComplete: false,
        };
        updatedWorkflow.sdlcComplete = true;
        updatedWorkflow.sdlcData = {
          duration: res.data?.predicted_sdlc_time
            ? `${Math.round(res.data.predicted_sdlc_time)} days`
            : "Calculated",
        };
        localStorage.setItem(workflowKey, JSON.stringify(updatedWorkflow));

      } catch (error) {
        setError("Error fetching data");
        console.error("Error fetching SDLC data:", error);
        console.error("Error parsing payload:", error);
      } finally {
        setLoading(false); // Set loading to false once data fetching is done
      }
    } else {
      setLoading(false); // Set loading to false if no payload is found
    }
  };

  const handlePending = (value) => {
    setIsPending(value);
  };

  const handleApprove = async (approve) => {
    try {
      if (approve) {
        // Update project status to approved (1)
        await axios.put(`/update-project/${selectedProject.Name}`, {
          ...selectedProject,
          status: 1,
        });
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Project has been approved!",
        });
      } else {
        // Delete or decline the project
        await axios.delete(`/delete-project/${selectedProject.Name}`);
        Swal.fire({
          icon: "success",
          title: "Declined",
          text: "Project has been declined.",
        });
      }
      setIsPending(false);
      // Refresh the page or update state
      window.location.reload();
    } catch (error) {
      console.error("Error updating project:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update project status.",
      });
    }
  };

  const formatSDLCData = (sdlc) => {
    // Handle both old string format and new JSON format
    const reportText = typeof sdlc === 'object' ? sdlc.report : sdlc;

    if (!reportText) return "";

    return reportText
      .replace(
        /###\s*(.*)/g,
        "<br/><strong style='font-size: 1.2em; margin-bottom: 16px; display: block;'>$1</strong>"
      )
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /- (.*?)(?=\n|$)/g,
        "<div style='font-size: 1em; margin-bottom: 8px;'>- $1</div>"
      );
  };

  // Build sequential Gantt data: each phase starts after the previous ends
  const getGanttData = () => {
    if (!data || !data.base_time) return [];
    const baseTime = data.base_time;
    const adjustedTime =
      typeof data.sdlc === "object" && data.sdlc.adjusted_timeline
        ? data.sdlc.adjusted_timeline
        : {};

    const phases = [
      "Planning", "Requirements Analysis", "Design",
      "Coding", "Testing", "Deployment", "Maintenance",
    ];

    let cursor = 0;
    return phases.map((phase) => {
      const baseDur = baseTime[phase] || 0;
      const adjDur = adjustedTime[phase] || baseDur;
      const startDay = cursor;
      cursor += baseDur;
      return { phase, startDay, baseDur, adjDur, endDay: startDay + baseDur };
    });
  };

  const handleViewPayload = () => {
    const payloadLocal = localStorage.getItem("SearchPayload");
    if (payloadLocal) {
      setCurrentPayload(JSON.parse(payloadLocal));
      setIsViewPayloadModalVisible(true);
    } else {
      console.warn("No payload found in local storage.");
    }
  };

  const handleCloseViewPayloadModal = () => {
    setIsViewPayloadModalVisible(false);
  };

  return (
    <div id="sdlc-content" style={{ background: "#fafafa", minHeight: "100vh", padding: "24px" }}>
      {/* Header Section */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          background: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.primary} 100%)`,
          border: "none",
        }}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <RocketOutlined style={{ fontSize: 40, color: "#fff" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 28, color: "#fff" }}>
                SDLC Prediction Engine
              </h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>
                AI-Powered Software Development Life Cycle Analysis
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleViewPayload}
              icon={<EyeOutlined />}
              style={{ borderColor: "#fff", color: "#fff", background: "transparent" }}
              ghost
            >
              View Payload
            </Button>
            <Button
              onClick={exportToPDF}
              type="primary"
              icon={<DownloadOutlined />}
              disabled={!data}
              style={{ background: "#fff", borderColor: "#fff", color: colors.dark }}
            >
              Export Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Project Selection Card */}
      <Card
        title={
          <span style={{ color: colors.dark, fontSize: 16 }}>
            <ProjectOutlined style={{ marginRight: 8 }} />
            Select Project for Analysis
          </span>
        }
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Form form={form} name="control-hooks" onFinish={onFinish} layout="vertical">
          <Row gutter={24} align="middle">
            <Col xs={24} md={16}>
              <Form.Item
                name="name"
                label={<span style={{ fontWeight: 500 }}>Project Name</span>}
                rules={[{ required: true, message: "Please Select a Project Name" }]}
              >
                <Select
                  placeholder="-- Select a Project --"
                  allowClear
                  size="large"
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="children"
                >
                  {projectName?.map((prj) => (
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
                  icon={<ThunderboltOutlined />}
                  style={{ background: colors.primary, borderColor: colors.primary, height: 46 }}
                >
                  Analyze SDLC
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {/* Project Status */}
        <Divider style={{ margin: "16px 0" }} />
        <div className="flex items-center gap-2">
          <span style={{ fontWeight: 500 }}>Project Status:</span>
          {selectedProject.status === 1 ? (
            <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 14, padding: "4px 12px" }}>
              Approved
            </Tag>
          ) : selectedProject.status === 2 ? (
            <div className="flex items-center gap-3">
              <Tag icon={<ClockCircleOutlined />} color="warning" style={{ fontSize: 14, padding: "4px 12px" }}>
                Pending Approval
              </Tag>
              <Button
                onClick={() => handlePending(true)}
                type="primary"
                size="small"
                style={{ background: colors.primary }}
              >
                Approve / Decline
              </Button>
            </div>
          ) : selectedProject.status === 3 ? (
            <Tag icon={<SyncOutlined spin />} color="processing" style={{ fontSize: 14, padding: "4px 12px" }}>
              Processing
            </Tag>
          ) : (
            <Tag color="default" style={{ fontSize: 14, padding: "4px 12px" }}>
              No Project Selected
            </Tag>
          )}
        </div>
      </Card>

      {/* Workflow Warning */}
      {workflowWarning && (
        <Alert
          message={workflowWarning.message}
          description={
            <div>
              <p>{workflowWarning.description}</p>
              <div style={{ marginTop: 12 }}>
                {workflowWarning.missingSteps.includes("Team Allocation") && (
                  <Button
                    size="small"
                    type="link"
                    icon={<TeamOutlined />}
                    onClick={() => navigate("/team")}
                    style={{ paddingLeft: 0 }}
                  >
                    Go to Team Allocation
                  </Button>
                )}
                {workflowWarning.missingSteps.includes("Complexity Analysis") && (
                  <Button
                    size="small"
                    type="link"
                    icon={<ThunderboltOutlined />}
                    onClick={() => navigate("/complexity")}
                  >
                    Go to Complexity Analysis
                  </Button>
                )}
              </div>
            </div>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24, borderRadius: 12 }}
          closable
          onClose={() => setWorkflowWarning(null)}
        />
      )}

      {/* Workflow Status Badges */}
      {workflowStatus && (
        <Card
          size="small"
          style={{
            marginBottom: 24,
            borderRadius: 12,
            background: colors.background,
            borderColor: colors.light,
          }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <span style={{ fontWeight: 500, color: colors.dark }}>Analysis Progress:</span>
            <Tag
              icon={<CheckCircleOutlined />}
              color="success"
            >
              Requirements ✓
            </Tag>
            <Tag
              icon={workflowStatus.teamComplete ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
              color={workflowStatus.teamComplete ? "success" : "default"}
            >
              Team {workflowStatus.teamComplete ? "✓" : "Pending"}
            </Tag>
            <Tag
              icon={workflowStatus.complexityComplete ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
              color={workflowStatus.complexityComplete ? "success" : "default"}
            >
              Complexity {workflowStatus.complexityComplete ? "✓" : "Pending"}
            </Tag>
            <Tag
              icon={workflowStatus.sdlcComplete ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
              color={workflowStatus.sdlcComplete ? "success" : "processing"}
            >
              SDLC {workflowStatus.sdlcComplete ? "✓" : "In Progress"}
            </Tag>
          </div>
        </Card>
      )}

      {/* Results Section */}
      <div className="mt-6">
        {loading ? (
          <Card style={{ textAlign: "center", padding: 80, borderRadius: 12 }}>
            <Spin size="large" />
            <h3 style={{ marginTop: 24, color: colors.dark }}>Analyzing SDLC Phases...</h3>
            <p style={{ color: "#666" }}>Our AI is calculating optimal timelines for your project</p>
          </Card>
        ) : data ? (
          <div>
            {/* Project Details Card */}
            {projectInfo && (
              <Card
                title={
                  <span style={{ color: colors.dark }}>
                    <FileTextOutlined style={{ marginRight: 8 }} />
                    Project Overview
                  </span>
                }
                style={{
                  marginBottom: 24,
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <Row gutter={[24, 16]}>
                  <Col xs={12} md={4}>
                    <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                      <ProjectOutlined /> Project Name
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {projectInfo.name}
                    </div>
                  </Col>
                  <Col xs={12} md={4}>
                    <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                      Domain
                    </div>
                    <Tag color="blue">{projectInfo.domain}</Tag>
                  </Col>
                  <Col xs={12} md={4}>
                    <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                      <TeamOutlined /> Team Size
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {projectInfo.teamSize} members
                    </div>
                  </Col>
                  <Col xs={12} md={4}>
                    <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                      <DollarOutlined /> Budget
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      ${projectInfo.budget?.toLocaleString()}
                    </div>
                  </Col>
                  <Col xs={12} md={4}>
                    <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                      Tech Stack
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      {projectInfo.techStack}
                    </div>
                  </Col>
                  <Col xs={12} md={4}>
                    <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
                      Team Experience
                    </div>
                    <Tag color={
                      projectInfo.teamExperience === "High" ? "green" :
                        projectInfo.teamExperience === "Medium" ? "orange" : "red"
                    }>
                      {projectInfo.teamExperience}
                    </Tag>
                  </Col>
                </Row>
              </Card>
            )}

            {/* ── Gantt Chart ── */}
            <Card
              title={
                <span style={{ color: colors.dark }}>
                  <ProjectOutlined style={{ marginRight: 8 }} />
                  SDLC Timeline — Gantt Chart (Days)
                </span>
              }
              extra={
                <div className="flex gap-4">
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: colors.primary, display: "inline-block" }} />
                    Base Estimate
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: "#fa8c16", display: "inline-block", opacity: 0.7 }} />
                    Risk-Adjusted
                  </span>
                </div>
              }
              style={{ marginBottom: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            >
              {(() => {
                const gantt = getGanttData();
                if (!gantt.length) return null;
                const totalDays = gantt.reduce((s, g) => s + g.baseDur, 0);
                const ROW_H = 52;
                return (
                  <div style={{ overflowX: "auto" }}>
                    {/* Day ruler */}
                    <div style={{ display: "flex", marginLeft: 160, marginBottom: 4, position: "relative" }}>
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <span key={pct} style={{
                          position: "absolute", left: `${pct}%`,
                          fontSize: 11, color: "#999", transform: "translateX(-50%)"
                        }}>
                          {Math.round((pct / 100) * totalDays)}d
                        </span>
                      ))}
                    </div>
                    {/* Phase rows */}
                    {gantt.map((g, idx) => {
                      const baseLeft = (g.startDay / totalDays) * 100;
                      const baseWidth = (g.baseDur / totalDays) * 100;
                      const adjWidth = (g.adjDur / totalDays) * 100;
                      const rowBg = idx % 2 === 0 ? "#fafafa" : "#fff";
                      return (
                        <div key={g.phase} title={`${g.phase}: Day ${g.startDay} → ${g.endDay} (${g.baseDur} days base${g.adjDur !== g.baseDur ? `, ${g.adjDur}d adjusted` : ""})`}
                          style={{
                            display: "flex", alignItems: "center",
                            height: ROW_H, background: rowBg,
                            borderBottom: "1px solid #f0f0f0", cursor: "default",
                          }}
                        >
                          {/* Phase label */}
                          <div style={{
                            width: 160, minWidth: 160, paddingRight: 12,
                            fontSize: 12, fontWeight: 500, color: colors.dark,
                            textAlign: "right", lineHeight: 1.3,
                          }}>
                            {g.phase}
                          </div>

                          {/* Bar track */}
                          <div style={{ flex: 1, position: "relative", height: 28 }}>
                            {/* Grid lines */}
                            {[25, 50, 75].map((p) => (
                              <div key={p} style={{
                                position: "absolute", left: `${p}%`, top: 0,
                                height: "100%", borderLeft: "1px dashed #e8e8e8",
                              }} />
                            ))}

                            {/* Risk-adjusted bar (behind, orange) */}
                            {g.adjDur !== g.baseDur && (
                              <div style={{
                                position: "absolute",
                                left: `${baseLeft}%`,
                                width: `${adjWidth}%`,
                                top: 0, height: "100%",
                                background: "#fa8c16",
                                opacity: 0.35,
                                borderRadius: 4,
                              }} />
                            )}

                            {/* Base bar (primary green) */}
                            <div style={{
                              position: "absolute",
                              left: `${baseLeft}%`,
                              width: `${baseWidth}%`,
                              top: "15%", height: "70%",
                              background: `linear-gradient(90deg, ${colors.dark}, ${colors.primary})`,
                              borderRadius: 4,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              overflow: "hidden",
                              transition: "opacity 0.2s",
                            }}>
                              {baseWidth > 8 && (
                                <span style={{ fontSize: 11, color: "#fff", fontWeight: 600, whiteSpace: "nowrap", padding: "0 6px" }}>
                                  {g.baseDur}d
                                </span>
                              )}
                            </div>

                            {/* Start/End day labels */}
                            <div style={{
                              position: "absolute",
                              left: `calc(${baseLeft}% + ${baseWidth}% + 4px)`,
                              top: "50%", transform: "translateY(-50%)",
                              fontSize: 11, color: "#aaa", whiteSpace: "nowrap",
                            }}>
                              ↦ Day {g.startDay}–{g.endDay}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Total bar */}
                    <div style={{
                      display: "flex", alignItems: "center", marginTop: 12,
                      padding: "8px 0", borderTop: `2px solid ${colors.light}`,
                    }}>
                      <div style={{ width: 160, minWidth: 160, paddingRight: 12, textAlign: "right" }}>
                        <span style={{ fontWeight: 700, color: colors.dark, fontSize: 13 }}>Total</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: colors.primary }}>
                          {totalDays} days
                        </span>
                        {gantt.some(g => g.adjDur !== g.baseDur) && (
                          <span style={{ fontSize: 12, color: "#fa8c16", marginLeft: 12 }}>
                            ({gantt.reduce((s, g) => s + g.adjDur, 0)}d risk-adjusted)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* SDLC Details - AI Analysis */}
            <Card
              title={
                <span style={{ color: colors.dark }}>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  AI Analysis & Recommendations
                </span>
              }
              style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            >
              <div
                style={{
                  padding: "20px",
                  background: colors.background,
                  borderRadius: 12,
                  lineHeight: 1.9,
                  fontSize: 14,
                }}
                dangerouslySetInnerHTML={{
                  __html: data.sdlc ? formatSDLCData(data.sdlc) : "No SDLC Data Available",
                }}
              />
            </Card>
          </div>
        ) : (
          <Card
            style={{
              textAlign: "center",
              padding: 80,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${colors.background} 0%, #fff 100%)`,
            }}
          >
            <RocketOutlined style={{ fontSize: 80, color: colors.light, marginBottom: 24 }} />
            <h2 style={{ color: colors.dark, marginBottom: 8 }}>Ready for SDLC Analysis</h2>
            <p style={{ color: "#666", fontSize: 16, maxWidth: 400, margin: "0 auto" }}>
              Select a project from the dropdown above and click "Analyze SDLC" to generate a comprehensive timeline prediction
            </p>
          </Card>
        )}
      </div>

      {/* View Payload Modal */}
      <Modal
        title={
          <span>
            <EyeOutlined style={{ marginRight: 8 }} />
            Current Payload
          </span>
        }
        open={isViewPayloadModalVisible}
        onOk={handleCloseViewPayloadModal}
        onCancel={handleCloseViewPayloadModal}
        footer={[
          <Button key="close" type="primary" onClick={handleCloseViewPayloadModal} style={{ background: colors.primary }}>
            Close
          </Button>,
        ]}
      >
        {currentPayload ? (
          <pre style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, overflow: "auto" }}>
            {JSON.stringify(currentPayload, null, 2)}
          </pre>
        ) : (
          <div>No payload found in local storage.</div>
        )}
      </Modal>

      {/* Approve/Decline Modal */}
      <Modal
        title="Project Approval"
        open={isPending}
        footer={false}
        onCancel={() => handlePending(false)}
      >
        <p style={{ marginBottom: 16 }}>Do you want to approve this project?</p>
        <div className="flex flex-row gap-2 justify-end">
          <Button onClick={() => handleApprove(true)} type="primary" style={{ background: colors.primary }}>
            Approve Project
          </Button>
          <Button onClick={() => handleApprove(false)} danger type="primary">
            Decline Project
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SDLC;