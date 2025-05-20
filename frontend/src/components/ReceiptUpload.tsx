import React, { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Divider,
} from "@mui/material";
import {
  Upload as UploadIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { uploadReceipt } from "../services/api";
import { Ingredient } from "../types";

interface ReceiptUploadProps {
  onUploadSuccess?: (ingredients: Ingredient[]) => void;
  onUploadError?: (error: Error) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // Increased to 10MB
const ACCEPTED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/pdf": [".pdf"], // Added PDF support
};

const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [methodUsed, setMethodUsed] = useState<string>("");

  // Simulate progress during upload since we don't have actual progress events
  const simulateProgress = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 10;
      if (currentProgress > 95) {
        currentProgress = 95; // Cap at 95% until actually complete
        clearInterval(interval);
      }
      setProgress(currentProgress);
    }, 500);
    return interval;
  };

  const handleDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0].code === "file-too-large") {
          setError(
            `File is too large. Maximum size is ${
              MAX_FILE_SIZE / 1024 / 1024
            }MB.`
          );
        } else if (rejection.errors[0].code === "file-invalid-type") {
          setError(
            "Invalid file type. Only JPG, PNG, and PDF files are accepted."
          );
        } else {
          setError(rejection.errors[0].message);
        }
        return;
      }

      // Handle accepted files
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];

        // Create preview URL for images only
        if (selectedFile.type.startsWith("image/")) {
          const preview = URL.createObjectURL(selectedFile);
          setPreviewUrl(preview);
        } else {
          setPreviewUrl(null);
        }

        setFile(selectedFile);
        setError(null);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setOcrText("");
    setRawItems([]);
    setMethodUsed("");

    // Start progress simulation
    const progressInterval = simulateProgress();

    try {
      const response = await uploadReceipt(file);

      // Log response for debugging
      console.log("Receipt upload response:", response);

      // Extract debug info if available
      if (response && response.debug) {
        setOcrText(response.debug.ocr_text || "");
        setRawItems(response.debug.raw_items || []);
        setMethodUsed(response.debug.method_used || "Unknown");
        setDebugOpen(true);
      }

      // Complete progress
      clearInterval(progressInterval);
      setProgress(100);

      // Wait a moment to show 100% progress
      setTimeout(() => {
        setUploading(false);
        setFile(null);
        setPreviewUrl(null);

        // Call the success callback if provided
        if (onUploadSuccess) {
          onUploadSuccess(response.items || response);
        }
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      setUploading(false);
      setProgress(0);

      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while uploading the receipt";

      // Special handling for timeout errors
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("Timeout")
      ) {
        setError(
          "Request timed out. The receipt may be too large or complex to process. Try a clearer image or a different receipt."
        );
      } else {
        setError(errorMessage);
      }

      // Call the error callback if provided
      if (onUploadError && err instanceof Error) {
        onUploadError(err);
      }
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  const renderDebugInfo = () => {
    if (!ocrText && rawItems.length === 0) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Accordion
          expanded={debugOpen}
          onChange={() => setDebugOpen(!debugOpen)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Receipt Processing Debug Information
              {methodUsed && (
                <Box
                  component="span"
                  sx={{ color: "text.secondary", ml: 1, fontWeight: "normal" }}
                >
                  ({methodUsed})
                </Box>
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="h6" gutterBottom>
              OCR Text Output
            </Typography>
            <TextField
              multiline
              fullWidth
              minRows={5}
              maxRows={15}
              value={ocrText}
              variant="outlined"
              InputProps={{
                readOnly: true,
              }}
              sx={{ mb: 3, fontFamily: "monospace" }}
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Extracted Items
            </Typography>
            <TextField
              multiline
              fullWidth
              minRows={5}
              maxRows={15}
              value={JSON.stringify(rawItems, null, 2)}
              variant="outlined"
              InputProps={{
                readOnly: true,
              }}
              sx={{ fontFamily: "monospace" }}
            />
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  // Render processing method badge
  const renderProcessingMethod = () => {
    if (!methodUsed) return null;

    const isAI = methodUsed.includes("Vision");

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mt: 2,
          p: 1,
          borderRadius: 1,
          bgcolor: isAI ? "success.light" : "info.light",
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: isAI ? "success.dark" : "info.dark" }}
        >
          {isAI ? "🤖 AI-Powered Processing" : "📷 OCR Processing"}:{" "}
          {methodUsed}
        </Typography>
      </Box>
    );
  };

  return (
    <Box>
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          backgroundColor: "#f9f9f9",
          border: "2px dashed #ddd",
        }}
      >
        {!file ? (
          <Box
            {...getRootProps()}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              py: 3,
            }}
          >
            <UploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
            <Typography variant="subtitle1" align="center" gutterBottom>
              Drag & drop a receipt image or click to select
            </Typography>
            <Typography variant="body2" align="center" color="textSecondary">
              Accepts JPG, PNG, and PDF files up to 10MB
            </Typography>
            <input {...getInputProps()} />
          </Box>
        ) : (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FileIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="body1">{file.name}</Typography>
              </Box>
              <Button
                startIcon={<CloseIcon />}
                onClick={handleRemoveFile}
                size="small"
                disabled={uploading}
              >
                Remove
              </Button>
            </Box>

            {previewUrl && (
              <Box
                sx={{
                  my: 2,
                  display: "flex",
                  justifyContent: "center",
                  maxHeight: "200px",
                  overflow: "hidden",
                }}
              >
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "200px",
                    objectFit: "contain",
                  }}
                />
              </Box>
            )}

            {!uploading ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                fullWidth
                startIcon={<UploadIcon />}
              >
                Upload Receipt
              </Button>
            ) : (
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ mb: 2 }}
                />
                <Typography
                  variant="body2"
                  color="textSecondary"
                  align="center"
                  gutterBottom
                >
                  Uploading and processing receipt... {Math.round(progress)}%
                </Typography>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  align="center"
                >
                  This may take a minute or two depending on the complexity of
                  the receipt.
                </Typography>
              </Box>
            )}

            {!uploading && methodUsed && renderProcessingMethod()}
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {renderDebugInfo()}
    </Box>
  );
};

export default ReceiptUpload;
