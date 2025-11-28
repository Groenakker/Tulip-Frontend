import React from "react";
import "./Modal.css";
import { IoMdClose } from "react-icons/io";

const Modal = ({ children, onClose }) => {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalWindow" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose}>
          <IoMdClose />
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
