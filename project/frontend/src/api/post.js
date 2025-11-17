import axios from "axios";

const API = "http://127.0.0.1:5000/post";

export const getPosts = async (courseId, type) => {
  const res = await axios.get(API, { params: { course_id: courseId, type } });
  return res.data;
};

export const createPost = async (token, postData) => {
  const res = await axios.post(API, postData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const deletePost = async (token, postId) => {
  return axios.delete(`${API}/${postId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
