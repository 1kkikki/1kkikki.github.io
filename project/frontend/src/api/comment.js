import axios from "axios";

const API = "http://127.0.0.1:5000/comment";

export const getComments = async (postId) => {
  const res = await axios.get(`${API}/${postId}`);
  return res.data;
};

export const createComment = async (token, commentData) => {
  const res = await axios.post(API, commentData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
