import React from "react";
import { Form, Input } from "antd";
import { Link, useNavigate } from "react-router-dom";
import register from "../assets/user/register.jpg";
import axios from "../apis/axiosInstance";
import Swal from "sweetalert2";

const Register = () => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const result = await Swal.fire({
        title: "Do you want to Register With WeeNet Project Management?",
        showDenyButton: true,
        confirmButtonText: "Yes",
        denyButtonText: "No",
      });

      if (result.isConfirmed) {
        const res = await axios.post("/register", {
          firstname: values.firstname,
          lastname: values.lastname,
          email: values.email,
          password: values.password,
        });
        Swal.fire(
          "Congratulations! You Have Successfully Registered with WeeNet Project Management",
          "",
          "success"
        );
        navigate("/login");
      } else {
        Swal.fire("Registraion Cancelled", "", "error");
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: err.message,
      });
    }
  };
  const inputStyle =
    "w-full h-12 rounded-xl border border-[#d9e8cc] px-3 focus:border-[#4D6F2F] focus:shadow-none";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fbf2] to-[#edf4e4] px-6 py-10 lg:px-24">
      <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl bg-white p-6 shadow-xl lg:grid-cols-2 lg:p-10">
        <div>
          <h1 className="text-4xl font-extrabold text-[#2f4c1a]">Create Account</h1>
          <p className="mb-5 mt-2 text-[#5f6f52]">Register to start using WeeNet Project Management.</p>
          <Form
            name="register"
            onFinish={onFinish}
            initialValues={{
              prefix: "86",
            }}
            scrollToFirstError
          >
            <div className="pt-1">
              <Form.Item
                label="First Name"
                name="firstname"
                rules={[
                  {
                    required: true,
                    message: "Please input your FirstName!",
                    whitespace: true,
                  },
                ]}
                hasFeedback
              >
                <Input className={inputStyle} placeholder="John" />
              </Form.Item>
            </div>
            <div className="pt-1">
              <Form.Item
                label="Last Name"
                name="lastname"
                rules={[
                  {
                    required: true,
                    message: "Please input your LastName!",
                    whitespace: true,
                  },
                ]}
                hasFeedback
              >
                <Input className={inputStyle} placeholder="Doe" />
              </Form.Item>
            </div>

            <div className="pt-1">
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  {
                    type: "email",
                    message: "The input is not valid E-mail!",
                  },
                  {
                    required: true,
                    message: "Please input your E-mail!",
                  },
                ]}
                hasFeedback
              >
                <Input className={inputStyle} placeholder="you@example.com" />
              </Form.Item>
            </div>

            <div className="pt-1">
              <Form.Item
                label="Password"
                name="password"
                rules={[
                  {
                    required: true,
                    message: "Please input your password!",
                  },
                  {
                    min: 8,
                    message: "Password must be at least 8 characters.",
                  },
                  {
                    pattern: /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/,
                    message:
                      "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
                  },
                ]}
                hasFeedback
              >
                <Input.Password className={inputStyle} placeholder="Password" />
              </Form.Item>
            </div>

            <div className="pt-1">
              <Form.Item
                label="Confirm Password"
                name="confirm"
                dependencies={["password"]}
                hasFeedback
                rules={[
                  {
                    required: true,
                    message: "Please confirm your password!",
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(
                          "The new password that you entered do not match!"
                        )
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  className={inputStyle}
                  placeholder="Confirm Password"
                />
              </Form.Item>
            </div>

            <div className="pt-2">
              <div>
                <Form.Item>
                  <button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-[#4D6F2F] font-semibold text-white transition hover:bg-[#3f5e28]"
                  >
                    Register
                  </button>
                </Form.Item>
              </div>
            </div>

            <div className="pt-1 text-sm text-[#5f6f52]">
              <Link to="/login" className="text-[#4D6F2F] hover:underline">
                Already a member? Login
              </Link>
            </div>
          </Form>
        </div>

        <img
          className="h-full w-full rounded-2xl object-cover"
          src={register}
          alt=""
        />
      </div>
    </div>
  );
};

export default Register;
