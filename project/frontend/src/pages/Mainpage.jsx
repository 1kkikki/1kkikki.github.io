import React from "react";
import { Link } from "react-router-dom"; 
import "./mainpage.css";

export default function Mainpage() {

  return (
    <div className="main-page" data-model-id="1:9">
      <div className="text-wrapper">All Meet</div>

      <div className="div">teem kkikki</div>

      <img
        className="rectangle"
        alt="Rectangle"
        src="https://c.animaapp.com/CZN02acI/img/rectangle-22.svg"
      />

      <Link to="/login" className="text-wrapper-2">login</Link>
      <Link to="/signup" className="text-wrapper-3">sign up</Link>
    </div>
  );
};
