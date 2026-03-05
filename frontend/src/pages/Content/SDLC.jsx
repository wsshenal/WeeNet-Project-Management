import React, { useEffect, useState } from "react";
import axios from "../../apis/axiosInstance";
import { Spin, Button, Modal, Form, Input, Select, Tag } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
    const projects = localStorage.getItem("projects");
    const parsedPrj = JSON.parse(projects) || [];
    const selectedProj = parsedPrj.filter((prj) => prj.Name === values.name);

    console.log(selectedProj[0]);

    localStorage.setItem("SearchPayload", JSON.stringify(selectedProj[0]));

    const payload = selectedProj[0];
    setSeletedProject(payload);
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
        console.log(res.data);
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

  const prepareChartData = (baseTime) => {
    return Object.keys(baseTime).map((key) => ({
      name: key,
      time: baseTime[key],
    }));
  };

  const formatSDLCData = (sdlc) => {
    return sdlc
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
  const calculateSum = (baseTime) => {
    return Object.values(baseTime).reduce((sum, value) => sum + value, 0);
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

  return (
    <div id="sdlc-content">
      <div className="flex justify-between items-center mb-4">
        <div className="text-2xl">SDLC</div>
        <div className="flex gap-3">
          <div>
            <Button onClick={handleViewPayload} type="default">
              View Current Payload
            </Button>
          </div>
          <div>
            <Button onClick={exportToPDF} type="primary" disabled={!data}>
              Export to PDF
            </Button>
          </div>
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
                  <Option key={prj.Name} value={prj.Name}>
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
              <Button type="primary" htmlType="submit" style={{backgroundColor: "#B0D287"}} loading={loading}>
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

              <div className="pt-4">
                <Button onClick={() => handlePending(true)} type="primary">
                  Approve / Decline
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
      </div>
      <div className="mt-10">
        {loading ? (
          <Spin />
        ) : data ? (
          <div>
            <p>
              {data && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={prepareChartData(data.base_time)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="time" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </p>
            <div className="mt-4 text-lg text-center font-bold pb-10">
              Total Time: {calculateSum(data.base_time)} Days
            </div>
            <p
              dangerouslySetInnerHTML={{
                __html: data.sdlc
                  ? formatSDLCData(data.sdlc)
                  : "No SDLC Data Available",
              }}
            ></p>
          </div>
        ) : (
          "No Data Found! Please Provide Data"
        )}
      </div>

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
            <Button onClick={() => handleApprove(true)} type="primary">
              Approve Project
            </Button>
          </div>
          <div>
            <Button
              onClick={() => handleApprove(false)}
              className="bg-red-600"
              type="primary"
            >
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SDLC;