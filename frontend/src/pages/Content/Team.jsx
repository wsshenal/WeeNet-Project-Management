import React, { useEffect, useState } from "react";
import { Table } from "antd";
import axios from "../../apis/axiosInstance";

const columns = [
  {
    title: "Role",
    dataIndex: "role",
    key: "role",
  },
  {
    title: "Count",
    dataIndex: "count",
    key: "count",
  },
];

const Team = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sendDetails = async () => {
      const payloadLocal = localStorage.getItem("SearchPayload");
      setLoading(true);

      if (payloadLocal) {
        try {
          const payload = JSON.parse(payloadLocal);
          const res = await axios.post("complexity", {
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
            "Project Scope": payload.project_scope,
            "Requirement specifity": payload.requirement_specifity,
            "Team Experience": payload.team_experience,
          });
          const formattedData = Object.keys(res.data.selected_team).map(
            (role) => ({
              role: role,
              count: res.data.selected_team[role],
            })
          );

          console.log(formattedData);
          setData(formattedData);
        } catch (error) {
          setError("Error fetching data");
          console.error("Error parsing payload:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    sendDetails();
  }, []);

  return (
    <div>
      <div className="text-2xl mb-8">Team</div>
      <div>
        {error && <div style={{ color: "red" }}>{error}</div>}
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="role"
        />
      </div>
    </div>
  );
};

export default Team;
