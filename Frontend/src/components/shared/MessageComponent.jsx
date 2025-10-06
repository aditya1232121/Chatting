// Frontend/src/components/shared/MessageComponent.jsx
import { Box, Typography, Avatar } from "@mui/material";
import React, { memo } from "react";
import { lightBlue } from "../../constants/color";
import moment from "moment";
import { fileFormat } from "../../lib/features";
import RenderAttachment from "./RenderAttachment";
import { motion } from "framer-motion";

const MessageComponent = ({ message, user }) => {
  const { sender = {}, content, attachments = [], createdAt } = message || {};
  const sameSender = sender?._id === user?._id;
  const timeAgo = createdAt ? moment(createdAt).fromNow() : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: sameSender ? 100 : -100 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        alignSelf: sameSender ? "flex-end" : "flex-start",
        backgroundColor: sameSender ? lightBlue : "white",
        color: "black",
        borderRadius: "10px",
        padding: "0.7rem",
        margin: "0.3rem 0",
        width: "fit-content",
        maxWidth: "75%",
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      {!sameSender && (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar src={sender?.avatar || "https://via.placeholder.com/150"} alt={sender?.name || "User"} sx={{ width: 24, height: 24 }} />
          <Typography color={lightBlue} fontWeight="600" variant="caption">
            {sender?.name || "Unknown User"}
          </Typography>
        </Box>
      )}

      {content && <Typography>{content}</Typography>}

      {Array.isArray(attachments) &&
        attachments.map((attachment, index) => {
          const url = attachment?.url || "";
          const file = fileFormat(url);
          return (
            <Box key={attachment._id || index}>
              <a href={url} target="_blank" rel="noopener noreferrer" download style={{ color: "black" }}>
                {RenderAttachment(file, url)}
              </a>
            </Box>
          );
        })}

      <Typography variant="caption" color="text.secondary" align={sameSender ? "right" : "left"}>
        {timeAgo}
      </Typography>
    </motion.div>
  );
};

export default memo(MessageComponent);
