import React, { useMemo } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
};

const formats = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background", "list", "bullet",
  "blockquote", "code-block", "link",
];

export default function RichTextEditor({ value, onChange, placeholder = "本文を入力...", readOnly = false, minHeight = 160 }) {
  const style = useMemo(() => ({ minHeight, marginBottom: 0 }), [minHeight]);
  return (
    <div className="rte-wrap" data-read-only={readOnly || undefined}>
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={readOnly ? { toolbar: false } : modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={style}
      />
    </div>
  );
}
