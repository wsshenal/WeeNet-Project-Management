import React, { useState, useMemo } from "react";
import {
  Card,
  Typography,
  Form,
  Select,
  Button,
  Row,
  Col,
  Table,
  Progress,
} from "antd";
import {
  BarChartOutlined,
  TeamOutlined,
  TrophyOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import axios from "../../apis/axiosInstance";

const { Title, Text } = Typography;
const { Option } = Select;

const columns = [
  {
    title: "Employee ID",
    dataIndex: "EmpID",
  },
  {
    title: "Role",
    dataIndex: "Role",
    render: (role) => (
      <span
        style={{
          background: "#E8F2DC",
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: 13,
        }}
      >
        {role}
      </span>
    ),
  },
  {
    title: "KPI Score",
    dataIndex: "KPI",
    render: (value) => (
      <div style={{ minWidth: 180 }}>
        <Progress
          percent={Number(value.toFixed(1))}
          strokeColor="#6A953F"
          trailColor="#E5E7EB"
          showInfo={false}
        />
        <Text strong style={{ color: "#4D6F2F" }}>
          {value.toFixed(1)}
        </Text>
      </div>
    ),
  },
];

const ViewKPI = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    const res = await axios.post("kpi/role", values);
    setData(res.data.kpis || []);
    setLoading(false);
  };

  const avgKPI = useMemo(() => {
    if (!data.length) return 0;
    return (
      data.reduce((sum, d) => sum + d.KPI, 0) / data.length
    ).toFixed(1);
  }, [data]);

  const topKPI = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map((d) => d.KPI)).toFixed(1);
  }, [data]);

  return (
    <div style={{ background: "#F6FAF3", padding: 40, minHeight: "100vh" }}>
      {/* Header */}
      <Title level={2} style={{ color: "#4D6F2F" }}>
        KPI Performance Dashboard
      </Title>
      <Text type="secondary">
        View and analyze team member performance metrics
      </Text>

      {/* Filters */}
      <Card
        style={{
          marginTop: 24,
          borderRadius: 20,
          background: "linear-gradient(135deg, #96BD68, #6A953F)",
        }}
      >
        <Form layout="inline" form={form} onFinish={onFinish}>
          <Form.Item name="domain" rules={[{ required: true }]}>
            <Select placeholder="Domain" style={{ width: 200 }}>
              <Option value="Finance">Finance</Option>
              <Option value="E-Commerce">E-Commerce</Option>
              <Option value="Health">Health</Option>
              <Option value="Education">Education</Option>
            </Select>
          </Form.Item>

          <Form.Item name="role" rules={[{ required: true }]}>
            <Select placeholder="Job Role" style={{ width: 260 }}>
              <Option value="Quality Assurance Engineer">
                Quality Assurance Engineer
              </Option>
              <Option value="Backend Engineer">Backend Engineer</Option>
              <Option value="Frontend Engineer">Frontend Engineer</Option>
              <Option value="Tech Lead">Tech Lead</Option>
            </Select>
          </Form.Item>

          <Button
            htmlType="submit"
            icon={<SearchOutlined />}
            style={{
              background: "#FFFFFF",
              color: "#4D6F2F",
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            Search KPI
          </Button>
        </Form>
      </Card>

      {/* Stats */}
      <Row gutter={24} style={{ marginTop: 32 }}>
        <Col span={8}>
          <Card style={{ borderRadius: 20 }}>
            <TeamOutlined style={{ fontSize: 32, color: "#6A953F" }} />
            <Text>Total Employees</Text>
            <Title level={2}>{data.length}</Title>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            style={{
              borderRadius: 20,
              background: "linear-gradient(135deg, #B0D287, #96BD68)",
              color: "#fff",
            }}
          >
            <BarChartOutlined style={{ fontSize: 32 }} />
            <Text>Average KPI</Text>
            <Title level={2} style={{ color: "#fff" }}>
              {avgKPI} / 100
            </Title>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            style={{
              borderRadius: 20,
              background: "linear-gradient(135deg, #6A953F, #4D6F2F)",
              color: "#fff",
            }}
          >
            <TrophyOutlined style={{ fontSize: 32 }} />
            <Text>Top Performer</Text>
            <Title level={2} style={{ color: "#fff" }}>
              {topKPI} / 100
            </Title>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card
        style={{
          marginTop: 32,
          borderRadius: 20,
        }}
      >
        <Title level={4} style={{ color: "#4D6F2F" }}>
          Performance Metrics
        </Title>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="EmpID"
          loading={loading}
          pagination={{ pageSize: 6 }}
        />
      </Card>
    </div>
  );
};

export default ViewKPI;
