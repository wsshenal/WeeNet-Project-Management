import React, { useEffect, useState } from "react";
import axios from "../../apis/axiosInstance";
import { Spin, Button, Modal, Form, Input, Select, Tag, Card, Typography, Divider, Row, Col, Space, Descriptions } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const RiskType = () => {
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

  const [selectedProject, setSeletedProject] = useState({});

  const { Option } = Select;

  useEffect(() => {
    const getProjects = async () => {
      const res = await axios.get("/get-projects");
      localStorage.setItem("projects", JSON.stringify(res.data));
      const selectionProjects = res.data?.filter((prj) => {
        return prj.status === 1 || prj.status === 2;
      });
      console.log("res", res.data);
      console.log("selection", selectionProjects);
      setProjectName(selectionProjects);
      setPending(4);
    };
    getProjects();
  }, []);

  const exportToPDF = () => {
    const input = document.getElementById("risk-type-content");
    if (input) {
      // apply export styling temporarily
      input.classList.add("exporting");
      html2canvas(input, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      })
        .then((canvas) => {
          const pdf = new jsPDF("p", "mm", "a4");

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = 10;
          const contentWidth = pageWidth - margin * 2;
          const contentHeight = pageHeight - margin * 2;
          const pageHeightPx = Math.floor((canvas.width * contentHeight) / contentWidth);
          let renderedHeight = 0;
          let pageIndex = 0;

          while (renderedHeight < canvas.height) {
            const pageCanvas = document.createElement("canvas");
            const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight);

            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;

            const ctx = pageCanvas.getContext("2d");
            if (!ctx) {
              throw new Error("Could not create canvas context for PDF export");
            }

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              renderedHeight,
              canvas.width,
              sliceHeight,
              0,
              0,
              pageCanvas.width,
              pageCanvas.height
            );

            const pageImgData = pageCanvas.toDataURL("image/png");
            const pageImgHeight = (pageCanvas.height * contentWidth) / pageCanvas.width;

            if (pageIndex > 0) {
              pdf.addPage();
            }
            pdf.addImage(pageImgData, "PNG", margin, margin, contentWidth, pageImgHeight);

            renderedHeight += sliceHeight;
            pageIndex += 1;
          }

          pdf.save("risk-analysis-output.pdf");
        })
        .catch((err) => {
          console.error("PDF export failed", err);
        })
        .finally(() => {
          input.classList.remove("exporting");
        });
    } else {
      console.error("Input element for PDF generation not found.");
    }
  };

  const reCalculate = () => {
    const payloadLocal = localStorage.getItem("SearchPayload");

    if (payloadLocal) {
      const payload = JSON.parse(payloadLocal);
      form.setFieldsValue(payload); // Set form values with the current payload
      setIsModalVisible(true); // Open the modal
    } else {
      console.log("No payload found in local storage.");
    }
  };

  const handleOk = async () => {
    setLoading(true);
    setIsModalVisible(false);
    setError(null);
    try {
      const updatedPayload = await form.validateFields();
      // Ensure "Expected Budget" is a number
      updatedPayload.Expected_Budget = Number(updatedPayload.Expected_Budget);
      const res = await axios.post("risk", {
        Domain: updatedPayload.Domain,
        "ML Components": updatedPayload.ML_Components,
        Backend: updatedPayload.Backend,
        Frontend: updatedPayload.Frontend,
        "Core Features": updatedPayload.Core_Features,
        "Tech Stack": updatedPayload.Tech_Stack,
        Mobile: updatedPayload.Mobile,
        Desktop: updatedPayload.Desktop,
        Web: updatedPayload.Web,
        IoT: updatedPayload.IoT,
        "Expected Team Size": updatedPayload.Expected_Team_Size,
        "Expected Budget": updatedPayload.Expected_Budget,
        project_scope: updatedPayload.project_scope,
        "Requirement specifity": updatedPayload.requirement_specifity,
        "Team Experience": updatedPayload.team_experience,
      });

      setData(res.data);
      localStorage.setItem("SearchPayload", JSON.stringify(updatedPayload));
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to recalculate risk.";
      setError(message);
      console.log("Validation/API Failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const onFinish = async (values) => {
    setLoading(true);
    setPending(3);
    setError(null);
    const projects = localStorage.getItem("projects");
    const parsedPrj = JSON.parse(projects) || [];
    const selectedProj = parsedPrj.filter((prj) => prj.Name === values.name);

    console.log(selectedProj[0]);

    localStorage.setItem("SearchPayload", JSON.stringify(selectedProj[0]));

    const payload = selectedProj[0];
    setSeletedProject(payload);
    if (payload) {
      try {
        const res = await axios.post("risk", {
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
      } catch (error) {
        const message =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Error fetching risk analysis.";
        setError(message);
        console.error("Error parsing payload:", error);
      } finally {
        setLoading(false); // Set loading to false once data fetching is done
      }
    } else {
      setLoading(false); // Set loading to false if no payload is found
    }
  };

  const handleViewPayload = () => {
    const payloadLocal = localStorage.getItem("SearchPayload");
    if (payloadLocal) {
      setCurrentPayload(JSON.parse(payloadLocal));
      setIsViewPayloadModalVisible(true);
    } else {
      console.log("No payload found in local storage.");
    }
  };

  const handleCloseViewPayloadModal = () => {
    setIsViewPayloadModalVisible(false);
  };

  const handlePending = (action) => {
    setIsPending(action);
  };
  const handleApprove = async (action) => {
    if (action) {
      try {
        const data = await axios.post("save-data", {
          Name: selectedProject.Name,
          // Num_of_stackholders:Num_of_stackholders,
          Domain: selectedProject.Domain,
          ML_Components: selectedProject.ML_Components,
          Backend: selectedProject.Backend,
          Frontend: selectedProject.Frontend,
          Core_Features: selectedProject.Core_Features,
          Tech_Stack: selectedProject.Tech_Stack,
          Mobile: Number(selectedProject.Mobile),
          Desktop: Number(selectedProject.Desktop),
          Web: Number(selectedProject.Web),
          IoT: Number(selectedProject.IoT),
          Expected_Team_Size: Number(selectedProject.Expected_Team_Size),
          Expected_Budget: Number(selectedProject.Expected_Budget),
          status: 1,
          project_scope: selectedProject.project_scope,
          // Keep both keys to support existing Excel column variants in this project.
          requirement_specification:
            selectedProject.requirement_specification ??
            selectedProject.requirement_specifity,
          requirement_specifity:
            selectedProject.requirement_specifity ??
            selectedProject.requirement_specification,
          team_experience: selectedProject.team_experience,
        });
        handlePending(false);
        Swal.fire("Project Approved", "", "success");
        setTimeout(() => {
          navigate("/projects");
        }, 2000);
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        const data = await axios.post("save-data", {
          Name: selectedProject.Name,
          // Num_of_stackholders:Num_of_stackholders,
          Domain: selectedProject.Domain,
          ML_Components: selectedProject.ML_Components,
          Backend: selectedProject.Backend,
          Frontend: selectedProject.Frontend,
          Core_Features: selectedProject.Core_Features,
          Tech_Stack: selectedProject.Tech_Stack,
          Mobile: Number(selectedProject.Mobile),
          Desktop: Number(selectedProject.Desktop),
          Web: Number(selectedProject.Web),
          IoT: Number(selectedProject.IoT),
          Expected_Team_Size: Number(selectedProject.Expected_Team_Size),
          Expected_Budget: Number(selectedProject.Expected_Budget),
          status: 4,
          project_scope: selectedProject.project_scope,
          requirement_specification:
            selectedProject.requirement_specification ??
            selectedProject.requirement_specifity,
          requirement_specifity:
            selectedProject.requirement_specifity ??
            selectedProject.requirement_specification,
          team_experience: selectedProject.team_experience,
        });
        handlePending(false);
        Swal.fire("Project Deleted", "", "success");
        setTimeout(() => {
          navigate("/projects");
        }, 2000);
      } catch (error) {
        console.log("error");
      }
    }
  };

  const stripLeadingHeading = (text, heading) => {
    if (!text) return "";
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^\\s*#{0,6}\\s*${escapedHeading}\\s*:?\\s*`, "i");
    return text.replace(pattern, "").trim();
  };

  const normalizeRiskLabel = (label) => {
    const raw = String(label || "").toLowerCase();
    if (raw.includes("high")) return "High";
    if (raw.includes("low")) return "Low";
    return "Medium";
  };

  const getSectionContent = (markdown, heading) => {
    if (!markdown) return "";
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sectionRegex = new RegExp(
      `#{1,6}\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n#{1,6}\\s+|$)`,
      "i"
    );
    const match = markdown.match(sectionRegex);
    return match ? match[1] : "";
  };

  const extractBulletItems = (markdown) => {
    if (!markdown) return [];
    const matches = [...markdown.matchAll(/^\s*(?:[-*]|\d+\.)\s+(.+)$/gm)];
    return matches.map((m) => m[1].trim()).filter(Boolean);
  };

  const getDriverWeight = (factorText) => {
    const text = factorText.toLowerCase();
    if (text.includes("budget")) return 34;
    if (text.includes("team")) return 30;
    if (text.includes("platform")) return 22;
    if (text.includes("requirement")) return 18;
    if (text.includes("experience")) return 16;
    if (text.includes("ml")) return 14;
    if (text.includes("integration")) return 13;
    if (text.includes("domain")) return 12;
    if (text.includes("stack")) return 11;
    return 9;
  };

  const truncateLabel = (text, maxLen = 36) =>
    text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;

  const riskFactorsMarkdown = getSectionContent(data?.risk || "", "Risk Factors");
  const riskFactors = extractBulletItems(riskFactorsMarkdown).slice(0, 6);
  const topDriversData = riskFactors
    .map((factor) => ({
      factor,
      short: truncateLabel(factor, 40),
      impact: getDriverWeight(factor),
    }))
    .sort((a, b) => b.impact - a.impact);

  const mitigationItems = extractBulletItems(data?.mitigation_steps || "");
  const riskScoreMap = { Low: 28, Medium: 62, High: 86 };
  const riskLevel = normalizeRiskLabel(data?.mitigation);
  const currentRiskScore = riskScoreMap[riskLevel];
  const estimatedReduction = Math.min(
    34,
    Math.max(8, mitigationItems.length * 4 + Math.round(topDriversData.length * 1.2))
  );
  const postMitigationScore = Math.max(18, currentRiskScore - estimatedReduction);
  const mitigationImpactData = [
    { name: "Current", score: currentRiskScore, fill: "#ef4444" },
    { name: "Post-Mitigation (Est.)", score: postMitigationScore, fill: "#22c55e" },
  ];

  // Added: helper to determine risk level and mitigation (hard-coded rules)
  const getRiskInfo = () => {
    const payload =
      (Object.keys(selectedProject || {}).length && selectedProject) ||
      data ||
      currentPayload ||
      null;

    const defaultMedium = {
      level: "Medium",
      color: "warning",
      mitigations: [
        "Clarify requirements with stakeholders.",
        "Allocate a small pilot team to validate assumptions.",
        "Schedule regular checkpoints and reviews.",
      ],
    };

    if (!payload) return defaultMedium;

    // Use Expected_Budget if available (hard-coded thresholds)
    const budget = payload.Expected_Budget
      ? Number(payload.Expected_Budget)
      : null;

    if (budget !== null && !isNaN(budget)) {
      if (budget < 50000) {
        return {
          level: "High",
          color: "error",
          mitigations: [
            "Reduce scope and focus on MVP features.",
            "Increase contingency budget or seek additional funding.",
            "Engage experienced architects to reduce rework.",
          ],
        };
      }
      if (budget < 150000) {
        return {
          level: "Medium",
          color: "warning",
          mitigations: [
            "Prioritize features and create phased delivery plan.",
            "Monitor costs closely and optimize resource allocation.",
            "Run a technical spike for risky components.",
          ],
        };
      }
      return {
        level: "Low",
        color: "success",
        mitigations: [
          "Proceed with standard delivery processes.",
          "Keep regular reviews and automated testing in place.",
          "Maintain clear documentation and knowledge sharing.",
        ],
      };
    }

    // Fallback: use ML_Components presence as an indicator (hard-coded)
    if (payload.ML_Components) {
      if (
        /Prediction|Classification|Recommendation/i.test(payload.ML_Components)
      ) {
        return {
          level: "High",
          color: "error",
          mitigations: [
            "Validate datasets and model assumptions early.",
            "Plan for model monitoring and data drift detection.",
            "Start with a proof-of-concept model.",
          ],
        };
      }
    }

    return defaultMedium;
  };

  return (
    <div id="risk-type-content" className="p-6 max-w-4xl mx-auto">
      <Card
        title={<Typography.Title level={3}>Risk Analysis</Typography.Title>}
        extra={
          <Space>
            <Button onClick={handleViewPayload}>View Payload</Button>
            <Button onClick={exportToPDF} type="primary" disabled={!data}>
              Export PDF
            </Button>
          </Space>
        }
      >
        {selectedProject && selectedProject.Name && (
          <Typography.Paragraph className="mb-4">
            <strong>Project Name:</strong> {selectedProject.Name}
          </Typography.Paragraph>
        )}
        <Form form={form} name="control-hooks" onFinish={onFinish} layout="vertical">
          <div className="flex flex-row">
            <Form.Item
              name="name"
              label="Project Name"
              rules={[
                {
                  required: true,
                  message: "Please Select a Project Name",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Select placeholder="--Select a Project--" allowClear>
                {projectName?.map((prj, idx) => (
                  <Option key={prj.Name || idx} value={prj.Name}>
                    {prj.Name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              wrapperCol={{
                offset: 6,
                span: 16,
              }}
            >
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: "#B0D287", borderColor: "#B0D287" }}
                loading={loading}
              >
                Submit
              </Button>
            </Form.Item>
          </div>
        </Form>

        {error && (
          <Typography.Paragraph type="danger" className="mt-2 mb-0">
            {error}
          </Typography.Paragraph>
        )}

        <div>
          Project Status : {" "}
          {selectedProject.status === 1 ? (
            <Tag color="success">Approved</Tag>
          ) : selectedProject.status === 2 ? (
            <>
              <Tag color="warning">Pending</Tag>
              <div className="pt-4 flex flex-row gap-2">
                <Button
                  onClick={() => handleApprove(true)}
                  type="primary"
                  style={{ backgroundColor: "#B0D287", borderColor: "#B0D287" }}
                >
                  Approve
                </Button>
                <Button
                  onClick={() => handleApprove(false)}
                  type="primary"
                  style={{ backgroundColor: "#F87171", borderColor: "#F87171" }}
                >
                  Decline
                </Button>
              </div>
            </>
          ) : selectedProject.status === 3 ? (
            <Tag icon={<SyncOutlined spin />} color="processing">
              processing
            </Tag>
          ) : (
            <Tag color="error">Select a Project</Tag>
          )}
        </div>

        {data && (
          <Card type="inner" className="mt-6">
            <Typography.Title level={4} className="mb-0">
              Predicted Risk: {" "}
              <span className="export-risk-text">{data.mitigation}</span>
              <Tag
                color={
                  data.mitigation === "High"
                    ? "error"
                    : data.mitigation === "Low"
                    ? "success"
                    : "warning"
                }
              >
                {data.mitigation}
              </Tag>
            </Typography.Title>
            {topDriversData.length > 0 && (
              <>
                <Divider />
                <Typography.Title level={5}>Top Drivers</Typography.Title>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={topDriversData}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 40]} />
                      <YAxis type="category" dataKey="short" width={220} />
                      <Tooltip formatter={(value, _name, props) => [value, props.payload.factor]} />
                      <Bar dataKey="impact" fill="#f59e0b" name="Impact" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            {mitigationItems.length > 0 && (
              <>
                <Divider />
                <Typography.Title level={5}>Mitigation Impact</Typography.Title>
                <div style={{ width: "100%", height: 250 }}>
                  <ResponsiveContainer>
                    <BarChart data={mitigationImpactData} margin={{ top: 8, right: 24, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" name="Risk Score" radius={[8, 8, 0, 0]}>
                        {mitigationImpactData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Typography.Text type="secondary">
                  Post-mitigation value is an estimate based on recommended steps.
                </Typography.Text>
              </>
            )}
            <Divider />
            <Typography.Title level={5}>Analysis</Typography.Title>
            <Typography.Paragraph>
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  table: ({node, ...props}) => <table className="markdown-table" {...props} />,
                  th: ({node, ...props}) => <th className="markdown-table-th" {...props} />,
                  td: ({node, ...props}) => <td className="markdown-table-td" {...props} />,
                }}>{data.risk}</ReactMarkdown>
              </div>
            </Typography.Paragraph>
            {data.mitigation_steps && (
              <>
                <Divider />
                <Typography.Title level={5}>Mitigation Steps</Typography.Title>
                <Typography.Paragraph>
                  <div className="prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {stripLeadingHeading(data.mitigation_steps, "Mitigation Steps")}
                    </ReactMarkdown>
                  </div>
                </Typography.Paragraph>
              </>
            )}
          </Card>
        )}
      </Card>

      <Modal
        title="Edit Payload"
        open={isModalVisible}
        onOk={handleOk}
        okText={"Re Calculate Values"}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            name="Domain"
            label="Domain"
            rules={[
              {
                required: true,
                message: "Please Select a Domain",
              },
            ]}
          >
            <Select placeholder="--Select a Domain--" allowClear>
              <Option value="Finance">Finance</Option>
              <Option value="E-Commerce">E-Commerce</Option>
              <Option value="Health">Health</Option>
              <Option value="Education">Education</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="ML_Components"
            label="ML Components"
            rules={[
              {
                required: true,
                message: "Please input ML Component!",
              },
            ]}
          >
            <Select placeholder="--Select a ML Component--" allowClear>
              <Option value="Prediction Model">Prediction Model</Option>
              <Option value="Recommendation Engine">
                Recommendation Engine
              </Option>
              <Option value="Classification Model">Classification Model</Option>
              <Option value="Clustering Algorithm">Clustering Algorithm</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="Backend"
            label="Backend Technology"
            rules={[
              {
                required: true,
                message: "Please Select a Backend Technology",
              },
            ]}
          >
            <Select placeholder="--Select a Technology--" allowClear>
              <Option value="Node.js">Node.js</Option>
              <Option value="Django">Django</Option>
              <Option value="Flask">Flask</Option>
              <Option value="Spring Boot">Spring Boot</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="Frontend"
            label="Frontend Technology"
            rules={[
              {
                required: true,
                message: "Please Select a Frontend Technology",
              },
            ]}
          >
            <Select placeholder="--Select a Technology--" allowClear>
              <Option value="React">React.js</Option>
              <Option value="Angular">Angular.js</Option>
              <Option value="Vue.js">Vue.js</Option>
              <Option value="Svelte">Svelte</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="Core_Features"
            label="Core Features"
            rules={[
              {
                required: true,
                message: "Please input Core Features!",
              },
            ]}
          >
            <Select placeholder="--Select a Core Feature--" allowClear>
              <Option value="User Management">User Management</Option>
              <Option value="Payment Gateway">Payment Gateway</Option>
              <Option value="Appointment Booking">Appointment Booking</Option>
              <Option value="Product Catalog">Product Catalog</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="Tech_Stack"
            label="Tech Stack"
            rules={[
              {
                required: true,
                message: "Please input Tech Stack!",
              },
            ]}
          >
            <Select placeholder="--Select one--" allowClear>
              <Option value="MERN">MERN</Option>
              <Option value="LAMP">LAMP</Option>
              <Option value="Serverless">Serverless</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="Mobile"
            label="Mobile"
            rules={[
              {
                required: true,
                message: "Please input Mobile!",
              },
            ]}
          >
            <Select placeholder="--Select one--" allowClear>
              <Option value="1">Yes</Option>
              <Option value="0">No</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="Desktop"
            label="Desktop"
            rules={[
              {
                required: true,
                message: "Please input Desktop!",
              },
            ]}
          >
            <Select placeholder="--Select one--" allowClear>
              <Option value="1">Yes</Option>
              <Option value="0">No</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="Web"
            label="Web"
            rules={[
              {
                required: true,
                message: "Please input Web!",
              },
            ]}
          >
            <Select placeholder="--Select one--" allowClear>
              <Option value="1">Yes</Option>
              <Option value="0">No</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="IoT"
            label="IoT"
            rules={[
              {
                required: true,
                message: "Please input IoT!",
              },
            ]}
          >
            <Select placeholder="--Select one--" allowClear>
              <Option value="1">Yes</Option>
              <Option value="0">No</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="Expected_Team_Size"
            label="Expected Team Size"
            rules={[
              {
                required: true,
                message: "Please input Expected Team Size!",
              },
            ]}
          >
            <Input type="number" />
          </Form.Item>

          <Form.Item
            name="Expected_Budget"
            label="Expected Budget ($)"
            rules={[
              {
                required: true,
                message: "Please input Expected Budget!",
              },
            ]}
          >
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Current Payload"
        open={isViewPayloadModalVisible}
        onOk={handleCloseViewPayloadModal}
        onCancel={handleCloseViewPayloadModal}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={handleCloseViewPayloadModal}
          >
            Close
          </Button>,
        ]}
      >
        {currentPayload ? (
          <Descriptions bordered column={1} size="small">
            {Object.entries(currentPayload)
              .filter(([k, v]) => !(v === 0 || v === '0'))
              .map(([k, v]) => (
                <Descriptions.Item
                  key={k}
                  label={String(k).replace(/_|\b\w/g, (s) => s.replace(/_/g, ' ').toUpperCase())}
                >
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </Descriptions.Item>
              ))}
          </Descriptions>
        ) : (
          <div>No payload found in local storage.</div>
        )}
      </Modal>

      <Modal
        title="Edit Payload"
        open={isPending}
        footer={false}
        onCancel={() => handlePending(false)}
      >
        <div>Do You Want to Approve this Project</div>
        <div className="flex flex-row gap-2 mt-4 justify-end">
          <div>
            <Button
              onClick={() => handleApprove(true)}
              type="primary"
              style={{ backgroundColor: "#B0D287", borderColor: "#B0D287" }}
            >
              Approve Project
            </Button>
          </div>
          <div>
            <Button
              onClick={() => handleApprove(false)}
              type="primary"
              style={{ backgroundColor: "#F87171", borderColor: "#F87171" }}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RiskType;
