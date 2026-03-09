import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";

function SocialLogin() {
  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {

      localStorage.setItem("token", token);

      const user = jwtDecode(token);

      localStorage.setItem("user", JSON.stringify(user));

      window.location.href = "/home";

    } else {

      window.location.href = "/login";

    }

  }, []);

  return <div>Đang đăng nhập...</div>;
}

export default SocialLogin;