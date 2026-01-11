import React, { useEffect, useState } from "react";
import axios from "../../apis/axiosInstance";
import { Spin, Button, Modal, Form, Input, Select, Tag } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
      html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        pdf.setFontSize(50); // Increase the font size for better readability
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 10, 10, imgWidth - 20, imgHeight - 20);
        pdf.save("risk-analysis-output.pdf");
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
      });

      setData(res.data);
      localStorage.setItem("SearchPayload", JSON.stringify(updatedPayload));
    } catch (error) {
      console.log("Validation Failed:", error);
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
        setError("Error fetching data");
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
          requirement_specification: selectedProject.requirement_specification,
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
          requirement_specification: selectedProject.requirement_specification,
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
    <div id="risk-type-content" style={{ padding: "20px" }}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-2xl">Risk Analysis</div>
        <div>
          <Button onClick={handleViewPayload} type="default">
            View Current Payload
          </Button>
          <Button
            onClick={exportToPDF}
            type="primary"
            disabled={!data}
            className="ml-3"
          >
            Export to PDF
          </Button>
        </div>
      </div>
      <div className=" mt-10">
        <Form form={form} name="control-hooks" onFinish={onFinish}>
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
                {projectName?.map((prj) => (
                  <Option value={prj.Name}>{prj.Name}</Option>
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

        <div>
          Project Status :{" "}
          {selectedProject.status === 1 ? (
            <Tag color="success">Approved</Tag>
          ) : selectedProject.status === 2 ? (
            <>
              <Tag color="warning">Pending</Tag>

              {/* replaced single Approve/Decline button with two separate buttons */}
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

        {/* Added: Risk level and mitigation display (hard-coded rules) */}
        {(Object.keys(selectedProject || {}).length || data) && (
          (() => {
            const risk = getRiskInfo();
            return (
              <div className="mt-6">
                <div className="text-lg font-medium">
                  Risk Level: <Tag color={risk.color}>{risk.level}</Tag>
                </div>
                <div className="mt-3">
                  <div className="font-semibold">Mitigation Steps:</div>
                  <ul className="list-disc ml-5 mt-2">
                    {risk.mitigations.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()
        )}
      </div>

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
          <pre>{JSON.stringify(currentPayload, null, 2)}</pre>
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