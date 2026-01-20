import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import login from "../assets/user/signin.png";
import axios from "../apis/axiosInstance";
import { Form, Input } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";

const Login = () => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const res = await axios.post("login", {
        email: values.email,
        password: values.password,
      });
      if (res.data.status != 200) {
        throw new Error("Invalid User");
      }
      Swal.fire({
        icon: "success",
        title: "",
        text: res.data.response,
      });
      localStorage.setItem("user", "true");
      navigate("/requiremenT");
    } catch (err) {
      console.log(err);

      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: err,
      });
    }
  };

  const inputStyle =
    "w-full p-3 rounded-md border border-purple focus:outline-none focus:border-blue-500";

  return (
    <div className="flex flex-col lg:flex-row items-center px-6 lg:px-32 lg:pt-40 pt-10 gap-10">
      <div className="w-full ">
        <img
          className="rounded-3xl h-auto w-full object-cover"
          src={login}
          alt="Login illustration"
        />
      </div>
      <div className="justify-start items-center w-full ">
        <div>
          <span className="text-[46px]  font-extrabold text-[#4D6F2F]">
            Login
          </span>
          <h2 className="pt-8 font-semibold">Login to continue</h2>

          <Form name="basic" onFinish={onFinish} autoComplete="off">
            <div className="mt-4">
              <Form.Item
                name="email"
                rules={[
                  {
                    required: true,
                    message: "Please input your username!",
                  },
                  {
                    type: "email",
                    message: "The input is not valid E-mail!",
                  },
                ]}
                hasFeedback
              >
                <Input
                  prefix={<MailOutlined className="site-form-item-icon" />}
                  placeholder="email"
                  className={inputStyle}
                />
              </Form.Item>
            </div>

            <div className="mt-2">
              <Form.Item
                name="password"
                rules={[
                  {
                    required: true,
                    message: "Please input your password!",
                  },
                ]}
                hasFeedback
              >
                <Input.Password
                  prefix={<LockOutlined className="site-form-item-icon" />}
                  placeholder="Password"
                  className={inputStyle}
                />
              </Form.Item>
            </div>

            <div className="mt-2">
              <Form.Item>
                <button
                  type="submit"
                  className="bg-[#B0D287] text-white font-bold px-6 py-3 rounded-md hover:bg-[#333333]"
                >
                  Login
                </button>
              </Form.Item>
            </div>

            <div>
              <Link to="/register" className="text-[#4D6F2F] hover:underline">
                Not a member? Register
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
