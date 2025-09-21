import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("불러오는 중...");

  useEffect(() => {
    fetch("/api/hello")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => setMessage("에러 발생: " + err.message));
  }, []);

  return (
    <div>
      <h1>React + Flask 연결 테스트</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;
