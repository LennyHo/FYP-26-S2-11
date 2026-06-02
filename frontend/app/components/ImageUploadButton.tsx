import React from "react";

interface ImageUploadButtonProps {
  onImagePicked: (
    file: File,
    source: "camera" | "screenshot" | "clipboard",
  ) => void;
  disabled?: boolean;
}

const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onImagePicked,
  disabled,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onImagePicked(files[0], "camera");
    }
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", marginRight: 8 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={"environment" as any}
        style={{ display: "none" }}
        aria-hidden="true"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <button
        type="button"
        aria-label="Upload or take a photo"
        title="Upload or take a photo"
        disabled={disabled}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #A55EA3 0%, #AB1C6E 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.4rem",
          marginRight: 4,
          boxShadow: "0 2px 8px rgba(171, 28, 110, 0.12)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 0.2s",
          order: 1,
        }}
        onClick={() => {
          if (!disabled && fileInputRef.current) fileInputRef.current.click();
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </button>
    </div>
  );
};

export default ImageUploadButton;
