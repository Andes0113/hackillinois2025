import React from "react";

interface EmailPopupProps {
  onClose: () => void;
  sender: string;
  receiver: string;
  dateSent: string;
  subject?: string;
  message?: string;
}

const EmailPopup: React.FC<EmailPopupProps> = ({
  onClose,
  sender,
  receiver,
  dateSent,
  subject = "No Subject",
  message = "No message content.",
}) => {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>&times;</button>

        {/* Subject */}
        <h2 style={styles.subject}>{subject}</h2>

        {/* Email Header (Sender, Receiver, Date) */}
        <div style={styles.emailHeader}>
          <p style={styles.sender}>
            <strong>From:</strong> {sender}
          </p>
          <p style={styles.receiver}>
            <strong>To:</strong> {receiver}
          </p>
          <p style={styles.date}>{dateSent}</p>
        </div>

        {/* Email Body */}
        <div style={styles.messageContainer}>
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed" as "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  popup: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
    width: "1000px",
    minHeight: "600px",
    position: "relative" as "relative",
    display: "flex",
    flexDirection: "column" as "column",
    textAlign: "left" as "left",
  },
  closeButton: {
    position: "absolute" as "absolute",
    top: "10px",
    right: "15px",
    fontSize: "24px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888",
  },
  subject: {
    marginBottom: "10px",
    fontSize: "18px",
    fontWeight: "bold",
  },
  emailHeader: {
    borderBottom: "1px solid #ddd",
    paddingBottom: "10px",
    marginBottom: "10px",
  },
  sender: {
    margin: "5px 0",
  },
  receiver: {
    margin: "5px 0",
  },
  date: {
    fontSize: "14px",
    color: "#888",
    marginTop: "5px",
  },
  messageContainer: {
    fontSize: "16px",
    lineHeight: "1.5",
    padding: "10px 0",
  },
};

export default EmailPopup;
