import React, { useState, useEffect } from "react";
import { Tag, Table } from "antd";
import axios from "../../apis/axiosInstance";

const columns = [
  {
    title: "Name",
    dataIndex: "Name",
    key: "Name",
  },
  {
    title: "Frontend",
    dataIndex: "Frontend",
    key: "Frontend",
  },
  {
    title: "Backend",
    dataIndex: "Backend",
    key: "Backend",
  },
  {
    title: "Domain",
    dataIndex: "Domain",
    key: "Domain",
  },
  {
    title: "Expected Budget",
    dataIndex: "Expected_Budget",
    key: "Expected_Budget",
  },
  {
    title: "Tech Stack",
    dataIndex: "Tech_Stack",
    key: "Tech_Stack",
  },
  {
    title: "Project Scope",
    dataIndex: "project_scope",
    key: "project_scope",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (_, record) => {
      return (
        <>
          {record.status === 1 ? (
            <Tag color="success">Approved</Tag>
          ) : record.status === 2 ? (
            <Tag color="warning">Pending</Tag>
          ) : record.status === 4 ? (
            <Tag color="error">Deleted</Tag>
          ) : (
            <Tag color="error">Error</Tag>
          )}
        </>
      );
    },
  },
];

const Projects = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getProjects = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/get-projects");
        setData(res.data);
      } catch (error) {
        setError("Error fetching data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    getProjects();
  }, []);

  return (
    <div>
      <div className="text-2xl pb-10">Admin Approve Status</div>
      <div>
        {error && <div style={{ color: "red" }}>{error}</div>}
        <Table columns={columns} dataSource={data} loading={loading} />
      </div>
    </div>
  );
};

export default Projects;
