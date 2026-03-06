import React, { useState } from "react";
import {
  Card,
  Form,
  Select,
  Button,
  List,
  Typography,
  Tag,
  Space,
  Row,
  Col,
  Progress,
} from "antd";
import {
  BulbOutlined,
  RiseOutlined,
  FireOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import axios from "../../apis/axiosInstance";

const { Title, Text } = Typography;
const { Option } = Select;

const MLRecommendations = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [currentKPI, setCurrentKPI] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const employeeData = {
        Role: values.role,
        Domain: values.domain,
        ...values,
      };

      // Get current prediction
      const predRes = await axios.post("/ml/predict_kpi", employeeData);
      setCurrentKPI(predRes.data.prediction.predicted_kpi_score);

      // Get recommendations
      const recRes = await axios.post(
        "/ml/recommend_improvements",
        employeeData
      );
      setRecommendations(recRes.data.recommendations);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#F6FAF3", padding: 40, minHeight: "100vh" }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <Title level={2} style={{ color: "#4D6F2F" }}>
          <BulbOutlined /> AI Career Development Advisor
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Get personalized recommendations to boost your KPI score
        </Text>
      </div>

      {/* Input Form - Similar to MLPrediction */}
      <Card
        style={{
          maxWidth: 900,
          margin: "0 auto 32px",
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(106, 149, 63, 0.1)",
        }}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          {/* Same form fields as MLPrediction */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Job Role"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select role">
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
                rules={[{ required: true }]}
              >
                <Select placeholder="Select domain">
                  <Option value="Finance">Finance</Option>
                  <Option value="E-Commerce">E-Commerce</Option>
                  <Option value="Health">Health</Option>
                  <Option value="Education">Education</Option>
                </Select>
              </Form.Item>
            </Col>
            {/* Add more fields */}
          </Row>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            block
            icon={<RiseOutlined />}
            style={{
              background: "linear-gradient(135deg, #6A953F, #96BD68)",
              border: "none",
              height: 50,
            }}
          >
            Get Recommendations
          </Button>
        </Form>
      </Card>

      {/* Current KPI */}
      {currentKPI && (
        <Card
          style={{
            maxWidth: 900,
            margin: "0 auto 32px",
            borderRadius: 20,
            background: "linear-gradient(135deg, #6A953F, #96BD68)",
            color: "white",
          }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ color: "white", margin: 0 }}>
                Your Current KPI Score
              </Title>
            </Col>
            <Col>
              <Title level={2} style={{ color: "white", margin: 0 }}>
                {currentKPI.toFixed(2)} / 100
              </Title>
            </Col>
          </Row>
          <Progress
            percent={currentKPI}
            strokeColor="white"
            trailColor="rgba(255,255,255,0.3)"
            showInfo={false}
            style={{ marginTop: 16 }}
          />
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card
          style={{
            maxWidth: 900,
            margin: "0 auto",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(106, 149, 63, 0.1)",
          }}
        >
          <Title level={3} style={{ color: "#4D6F2F", marginBottom: 24 }}>
            <FireOutlined /> Recommended Improvements
          </Title>

          <List
            dataSource={recommendations}
            renderItem={(item, index) => (
              <Card
                style={{
                  marginBottom: 16,
                  borderRadius: 16,
                  background: index === 0 ? "#E8F2DC" : "white",
                  border: index === 0 ? "2px solid #6A953F" : "1px solid #f0f0f0",
                }}
              >
                <Row gutter={24} align="middle">
                  <Col span={16}>
                    <Space direction="vertical">
                      <Space>
                        {index === 0 && (
                          <Tag color="green" icon={<FireOutlined />}>
                            TOP PRIORITY
                          </Tag>
                        )}
                        <Tag color={item.priority === "High" ? "red" : "blue"}>
                          {item.priority}
                        </Tag>
                      </Space>

                      <Title level={5} style={{ margin: 0, color: "#4D6F2F" }}>
                        {item.feature}
                      </Title>

                      <Text type="secondary">
                        Current Level: <Text strong>{item.current_level}</Text>
                      </Text>

                      <Text type="secondary">
                        Recommended: <Text strong>{item.recommended_level}</Text>
                      </Text>
                    </Space>
                  </Col>

                  <Col span={8} style={{ textAlign: "center" }}>
                    <div>
                      <RiseOutlined
                        style={{ fontSize: 32, color: "#52c41a" }}
                      />
                    </div>
                    <Title
                      level={3}
                      style={{ margin: "8px 0", color: "#52c41a" }}
                    >
                      +{item.potential_kpi_increase.toFixed(2)}
                    </Title>
                    <Text type="secondary">Potential Increase</Text>
                  </Col>
                </Row>
              </Card>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default MLRecommendations;