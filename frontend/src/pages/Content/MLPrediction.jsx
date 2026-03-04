import React, { useState } from "react";
import {
  Card,
  Form,
  Select,
  Button,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Divider,
  Tag,
  Space,
  Alert,
  message,
} from "antd";
import {
  RobotOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  LineChartOutlined,
  BugOutlined,
} from "@ant-design/icons";
import axios from "../../apis/axiosInstance";

const { Title, Text } = Typography;
const { Option } = Select;

const MLPrediction = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    setPrediction(null);
    setComparison(null);

    try {
      // Prepare employee data - use exact field names
      const employeeData = {
        "Role": values.role,
        "Domain": values.domain,
        "Analytical Skills": values.analyticalSkills,
        "Technical Proficiency": values.technicalProficiency,
        "Years of experience in Business Analysis": values.yearsOfExperience,
        "Experience of related Domain": values.domainExperience,
      };

      // Store debug info
      setDebugInfo({
        sentData: employeeData,
        timestamp: new Date().toISOString(),
      });

      console.log("🚀 Sending ML prediction request:");
      console.log(JSON.stringify(employeeData, null, 2));

      // Get ML prediction
      const mlRes = await axios.post("/ml/predict_kpi", employeeData);
      
      console.log("✅ ML Response received:");
      console.log(JSON.stringify(mlRes.data, null, 2));

      if (mlRes.data.status === "success" && mlRes.data.prediction) {
        setPrediction(mlRes.data.prediction);
        message.success("KPI prediction successful!");

        // Get comparison with rule-based
        try {
          const compareRes = await axios.post("/ml/compare_methods", {
            role: values.role,
            employee_data: employeeData,
          });

          console.log("✅ Comparison Response received:");
          console.log(JSON.stringify(compareRes.data, null, 2));

          if (compareRes.data.status === "success" && compareRes.data.comparison) {
            setComparison(compareRes.data.comparison);
          }
        } catch (compareError) {
          console.warn("⚠️ Comparison failed (non-critical):", compareError);
          // Don't show error to user - comparison is optional
        }
      } else {
        throw new Error("Unexpected response format from server");
      }

    } catch (err) {
      console.error("❌ Error occurred:");
      console.error(err);

      let errorMessage = "An error occurred while predicting KPI";
      let errorDetails = null;

      if (err.response) {
        // Server responded with error
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);

        errorMessage = err.response.data.message || errorMessage;
        errorDetails = {
          status: err.response.status,
          serverMessage: err.response.data.message,
          traceback: err.response.data.traceback,
        };

        if (err.response.status === 500 && 
            err.response.data.message?.includes("ML models not loaded")) {
          errorMessage = "ML models are not loaded on the server. Please check server logs.";
        }
      } else if (err.request) {
        // Request made but no response
        errorMessage = "Server is not responding. Please check if Flask server is running.";
        errorDetails = { error: "No response from server" };
      } else {
        // Something else happened
        errorMessage = err.message;
        errorDetails = { error: err.message };
      }

      setError(errorMessage);
      setDebugInfo((prev) => ({
        ...prev,
        error: errorDetails,
      }));

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#F6FAF3", padding: 40, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <Title level={2} style={{ color: "#4D6F2F", marginBottom: 8 }}>
          <RobotOutlined /> AI-Powered KPI Prediction
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Get instant ML-based KPI predictions with confidence intervals
        </Text>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={
            <div>
              <p>{error}</p>
              {debugInfo?.error && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", color: "#096dd9" }}>
                    <BugOutlined /> View technical details
                  </summary>
                  <pre style={{ 
                    marginTop: 8, 
                    padding: 12, 
                    background: "#f5f5f5",
                    borderRadius: 4,
                    overflow: "auto",
                    maxHeight: 200,
                    fontSize: 12
                  }}>
                    {JSON.stringify(debugInfo.error, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          }
          type="error"
          closable
          onClose={() => {
            setError(null);
            setDebugInfo(null);
          }}
          style={{ maxWidth: 900, margin: "0 auto 24px", borderRadius: 12 }}
        />
      )}

      {/* Debug Info (only in development) */}
      {/* {process.env.NODE_ENV === 'development' && debugInfo && !error && (
        <Alert
          message="Debug Information"
          description={
            <details>
              <summary style={{ cursor: "pointer" }}>View sent data</summary>
              <pre style={{ 
                marginTop: 8, 
                padding: 12, 
                background: "#f5f5f5",
                borderRadius: 4,
                fontSize: 12
              }}>
                {JSON.stringify(debugInfo.sentData, null, 2)}
              </pre>
            </details>
          }
          type="info"
          style={{ maxWidth: 900, margin: "0 auto 24px", borderRadius: 12 }}
        />
      )} */}

      {/* Input Form */}
      <Card
        style={{
          maxWidth: 900,
          margin: "0 auto",
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(106, 149, 63, 0.1)",
        }}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Job Role"
                rules={[{ required: true, message: "Please select a role" }]}
              >
                <Select placeholder="Select role" size="large">
                  <Option value="Business Analyst">Business Analyst</Option>
                  <Option value="Backend Engineer">Backend Engineer</Option>
                  <Option value="Frontend Engineer">Frontend Engineer</Option>
                  <Option value="DevOps Engineer">DevOps Engineer</Option>
                  <Option value="Tech Lead">Tech Lead</Option>
                  <Option value="FullStack Engineer">FullStack Engineer</Option>
                  <Option value="Project Manager">Project Manager</Option>
                  <Option value="Quality Assurance Engineer">
                    Quality Assurance Engineer
                  </Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="domain"
                label="Domain"
                rules={[{ required: true, message: "Please select a domain" }]}
              >
                <Select placeholder="Select domain" size="large">
                  <Option value="Finance">Finance</Option>
                  <Option value="E-Commerce">E-Commerce</Option>
                  <Option value="Health">Health</Option>
                  <Option value="Education">Education</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="analyticalSkills"
                label="Analytical Skills"
                rules={[{ required: true, message: "Please select analytical skills" }]}
              >
                <Select placeholder="Select level" size="large">
                  <Option value="Novice">Novice</Option>
                  <Option value="Intermediate">Intermediate</Option>
                  <Option value="Advanced">Advanced</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="technicalProficiency"
                label="Technical Proficiency"
                rules={[{ required: true, message: "Please select technical proficiency" }]}
              >
                <Select placeholder="Select level" size="large">
                  <Option value="Novice">Novice</Option>
                  <Option value="Intermediate">Intermediate</Option>
                  <Option value="Advanced">Advanced</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="yearsOfExperience"
                label="Years of Experience"
                rules={[{ required: true, message: "Please select years of experience" }]}
              >
                <Select placeholder="Select years" size="large">
                  <Option value="1-2 years">1-2 years</Option>
                  <Option value="3-5 years">3-5 years</Option>
                  <Option value="5+ years">5+ years</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="domainExperience"
                label="Domain Experience"
                rules={[{ required: true, message: "Please select domain experience" }]}
              >
                <Select placeholder="Select years" size="large">
                  <Option value="0 - 5">0-5 years</Option>
                  <Option value="6 - 14">6-14 years</Option>
                  <Option value="15+">15+ years</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            block
            icon={<ThunderboltOutlined />}
            style={{
              background: "linear-gradient(135deg, #6A953F, #96BD68)",
              border: "none",
              height: 50,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {loading ? "Predicting..." : "Predict KPI with AI"}
          </Button>
        </Form>
      </Card>

      {/* Results */}
      {prediction && (
        <Card
          style={{
            maxWidth: 900,
            margin: "32px auto",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(106, 149, 63, 0.1)",
          }}
        >
          <Title level={3} style={{ color: "#4D6F2F", marginBottom: 24 }}>
            <TrophyOutlined /> Prediction Results
          </Title>

          {/* ML Prediction */}
          <Row gutter={24}>
            <Col span={8}>
              <Card
                style={{
                  background: "linear-gradient(135deg, #6A953F, #96BD68)",
                  borderRadius: 16,
                  color: "white",
                }}
              >
                <Statistic
                  title={
                    <span style={{ color: "white", fontSize: 14 }}>
                      ML Predicted KPI
                    </span>
                  }
                  value={prediction.predicted_kpi_score.toFixed(2)}
                  suffix="/ 100"
                  valueStyle={{ color: "white", fontSize: 32 }}
                />
                <Progress
                  percent={prediction.predicted_kpi_score}
                  strokeColor="white"
                  trailColor="rgba(255,255,255,0.3)"
                  showInfo={false}
                />
              </Card>
            </Col>

            <Col span={8}>
              <Card style={{ borderRadius: 16 }}>
                <Statistic
                  title="Performance Category"
                  value={prediction.performance_category}
                  valueStyle={{
                    color:
                      prediction.performance_category === "High"
                        ? "#52c41a"
                        : prediction.performance_category === "Medium"
                        ? "#faad14"
                        : "#ff4d4f",
                  }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>

            <Col span={8}>
              <Card style={{ borderRadius: 16 }}>
                <Statistic
                  title="Confidence Interval"
                  value={`${prediction.confidence_lower.toFixed(
                    1
                  )} - ${prediction.confidence_upper.toFixed(1)}`}
                  valueStyle={{ fontSize: 20, color: "#4D6F2F" }}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          {/* Feature Importance */}
          {prediction.top_contributing_factors && 
           prediction.top_contributing_factors.length > 0 && (
            <>
              <Title level={4} style={{ color: "#4D6F2F", marginTop: 24 }}>
                Top Contributing Factors
              </Title>
              <Space direction="vertical" style={{ width: "100%" }}>
                {prediction.top_contributing_factors.slice(0, 5).map((factor, i) => (
                  <Card key={i} style={{ borderRadius: 12, background: "#F6FAF3" }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text strong>{factor.feature}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Current: {factor.value}
                        </Text>
                      </Col>
                      <Col>
                        <Progress
                          type="circle"
                          percent={Math.round(factor.importance * 100)}
                          width={60}
                          strokeColor="#6A953F"
                        />
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            </>
          )}
        </Card>
      )}

      {/* Comparison */}
      {comparison && (
        <Card
          style={{
            maxWidth: 900,
            margin: "32px auto",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(106, 149, 63, 0.1)",
          }}
        >
          <Title level={3} style={{ color: "#4D6F2F", marginBottom: 24 }}>
            <LineChartOutlined /> ML vs Rule-Based Comparison
          </Title>

          <Row gutter={24}>
            <Col span={12}>
              <Card style={{ borderRadius: 16, background: "#E8F2DC" }}>
                <Statistic
                  title="Rule-Based KPI"
                  value={comparison.rule_based_kpi.toFixed(2)}
                  valueStyle={{ color: "#4D6F2F" }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card style={{ borderRadius: 16, background: "#D4E8C3" }}>
                <Statistic
                  title="ML Predicted KPI"
                  value={comparison.ml_predicted_kpi.toFixed(2)}
                  valueStyle={{ color: "#6A953F" }}
                />
              </Card>
            </Col>
          </Row>

          <Alert
            message={`Difference: ${comparison.difference.toFixed(
              2
            )} points (${comparison.percentage_difference.toFixed(1)}%)`}
            type={comparison.percentage_difference < 5 ? "success" : "warning"}
            showIcon
            style={{ marginTop: 16, borderRadius: 12 }}
          />
        </Card>
      )}
    </div>
  );
};

export default MLPrediction;