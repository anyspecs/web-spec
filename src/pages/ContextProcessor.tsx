import React, { useCallback, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Cloud,
  FolderOpen,
  Loader,
  ArrowRight,
  Sparkles,
  Clock,
  Copy,
  Save,
  RotateCcw,
  Share2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { processFileWithAihubmix } from "@/service/aihubmix";
import {
  parseApiResponseToSpecs,
  downloadSpecsFile,
} from "@/utils/specsGenerator";
import { Header } from "@/components/Header";
import type {
  UploadFile,
  ProcessingFile,
  ProcessingState,
  SpecsProcessingResult,
} from "@/types/context";
import type { User } from "@/types/user";

// 支持的文件格式配置
const SUPPORTED_FILE_FORMATS = {
  // 聊天记录和上下文文件
  context: ["ct", "specs"],
  // 文档格式
  documents: ["md", "txt", "rtf", "doc", "docx"],
  // 数据格式
  data: ["json", "yaml", "yml", "xml", "csv", "tsv"],
  // 网页格式
  web: ["html", "htm", "mhtml"],
  // 代码文件
  code: [
    "js",
    "ts",
    "jsx",
    "tsx",
    "py",
    "java",
    "cpp",
    "c",
    "cs",
    "php",
    "rb",
    "go",
    "rs",
    "swift",
    "kt",
    "scala",
    "sh",
    "bash",
    "zsh",
    "sql",
  ],
  // 配置文件
  config: ["ini", "cfg", "conf", "toml", "env"],
  // 日志文件
  logs: ["log", "logs"],
  // 其他文本文件
  other: ["readme", "license", "changelog"],
};

// 获取所有支持的扩展名
const getAllSupportedExtensions = (): string[] => {
  return Object.values(SUPPORTED_FILE_FORMATS).flat();
};

// 检查文件是否支持
const isFileSupported = (fileName: string | undefined): boolean => {
  if (!fileName || typeof fileName !== "string") {
    return false;
  }
  const extension = fileName.toLowerCase().split(".").pop() || "";
  return getAllSupportedExtensions().includes(extension);
};

interface ContextProcessorProps {
  user: User | null;
  onLogout: () => void;
}

export function ContextProcessor({ user, onLogout }: ContextProcessorProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [currentStep, setCurrentStep] = useState<
    "upload" | "process" | "complete"
  >("upload");
  const [showToast, setShowToast] = useState(false);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    e.preventDefault();

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // 处理文件
    if (clipboardData.files.length > 0) {
      const files = Array.from(clipboardData.files);
      const validFiles = files.filter((file) => {
        return file && file.name && isFileSupported(file.name);
      });

      const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
        file,
        name: file.name || "未知文件",
        size: `${((file.size || 0) / 1024).toFixed(1)} KB`,
        status: "uploading",
      }));

      setUploadFiles((prev) => [...prev, ...newUploadFiles]);
    }
    // 处理文本内容
    else if (clipboardData.getData("text")) {
      const textContent = clipboardData.getData("text");
      const blob = new Blob([textContent], { type: "text/plain" });
      const file = new File([blob], `clipboard-${Date.now()}.txt`, {
        type: "text/plain",
      });

      const newUploadFile: UploadFile = {
        file,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        status: "uploading",
      };

      setUploadFiles((prev) => [...prev, newUploadFile]);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter((file) => {
        return file && file.name && isFileSupported(file.name);
      });

      const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
        file,
        name: file.name || "未知文件",
        size: `${((file.size || 0) / 1024).toFixed(1)} KB`,
        status: "uploading",
      }));

      setUploadFiles((prev) => [...prev, ...newUploadFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const files = Array.from(selectedFiles);
      const validFiles = files.filter((file) => {
        return file && file.name && isFileSupported(file.name);
      });

      const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
        file,
        name: file.name || "未知文件",
        size: `${((file.size || 0) / 1024).toFixed(1)} KB`,
        status: "uploading",
      }));

      setUploadFiles((prev) => [...prev, ...newUploadFiles]);
    }
  };

  const handleProcess = async () => {
    if (uploadFiles.length === 0) return;

    setCurrentStep("process");

    // 转换为ProcessingFile格式
    const files: ProcessingFile[] = uploadFiles.map((file) => ({
      ...file,
      processingState: "idle" as ProcessingState,
    }));

    setProcessingFiles(files);

    // 依次处理每个文件
    for (let i = 0; i < files.length; i++) {
      try {
        // 更新状态为处理中
        setProcessingFiles((prev) =>
          prev.map((file, index) =>
            index === i ? { ...file, processingState: "generating" } : file
          )
        );

        // 直接传递文件给API处理
        setProcessingFiles((prev) =>
          prev.map((file, index) =>
            index === i ? { ...file, processingState: "processing" } : file
          )
        );

        const fileName = files[i]?.name || "未知文件";
        
        // 1. 获取原始API响应
        const apiResult = await processFileWithAihubmix(files[i].file);
        
        // 2. 解析API响应为specs格式
        const specsResult = parseApiResponseToSpecs(apiResult.rawResponse, fileName);
        
        // 3. 创建处理结果
        const result: SpecsProcessingResult = {
          summary: specsResult.summary,
          generatedAt: apiResult.generatedAt,
          processingTime: apiResult.processingTime,
          specsFile: specsResult.specsFile,
          specsFileName: specsResult.specsFileName,
          contextAnalysis: specsResult.contextAnalysis,
        };

        // 更新结果
        setProcessingFiles((prev) =>
          prev.map((file, index) =>
            index === i
              ? {
                  ...file,
                  processingState: "completed",
                  result,
                }
              : file
          )
        );
      } catch (error) {
        setProcessingFiles((prev) =>
          prev.map((file, index) =>
            index === i
              ? {
                  ...file,
                  processingState: "error",
                  error: error instanceof Error ? error.message : "处理失败",
                }
              : file
          )
        );
      }
    }

    setCurrentStep("complete");
  };

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeProcessingFile = (index: number) => {
    setProcessingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        <div
          className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            currentStep === "upload"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-600"
          )}
        >
          <Upload className="w-4 h-4" />
          <span>上传文件</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div
          className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            currentStep === "process"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-600"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI处理</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div
          className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            currentStep === "complete"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          )}
        >
          <CheckCircle className="w-4 h-4" />
          <span>完成</span>
        </div>
      </div>
    </div>
  );

  const renderUploadSection = () => (
    <div className="flex-1 p-6">
      <h3
        className="text-lg font-medium mb-4"
        style={{ color: "rgba(7, 11, 17, 1)" }}
      >
        上传文件
      </h3>

      <div
        className={cn(
          "upload-area flex flex-col justify-center items-center mb-6 pt-8 pr-6 pb-8 pl-6 border-2 border-dashed rounded-lg transition-colors",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div
          className="flex justify-center items-center w-16 h-16 mb-4 rounded-md"
          style={{ backgroundColor: "rgba(33, 37, 40, 1)" }}
        >
          <Cloud className="w-6 h-6 text-white" />
        </div>
        <p
          className="mb-2 text-sm font-medium"
          style={{ color: "rgba(7, 11, 17, 1)" }}
        >
          拖放文件到此处或粘贴剪切板内容
        </p>
        <p className="mb-4 text-xs" style={{ color: "rgba(136, 138, 139, 1)" }}>
          支持 50+ 种文件格式：文档、代码、配置、数据文件等
        </p>
        <label className="btn btn-primary btn-sm cursor-pointer">
          <FolderOpen className="w-4 h-4 mr-2" />
          浏览文件
          <input
            type="file"
            accept={getAllSupportedExtensions()
              .map((ext) => `.${ext}`)
              .join(",")}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {uploadFiles.length > 0 && (
        <div>
          <h4
            className="mb-3 text-sm font-medium"
            style={{ color: "rgba(7, 11, 17, 1)" }}
          >
            文件列表 ({uploadFiles.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center pt-3 pr-3 pb-3 pl-3 rounded-md"
                style={{ backgroundColor: "rgba(244, 246, 248, 1)" }}
              >
                <FileText className="w-4 h-4 mr-3 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: "rgba(7, 11, 17, 1)" }}
                  >
                    {file?.name || "未知文件"}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "rgba(136, 138, 139, 1)" }}
                  >
                    {file.size}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 hover:bg-gray-200 p-1 rounded"
                  style={{ color: "rgba(136, 138, 139, 1)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProcessSection = () => (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 min-h-[400px]">
      <div className="text-center">
        {currentStep === "upload" && (
          <>
            <div
              onClick={uploadFiles.length > 0 ? handleProcess : undefined}
              className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-lg ${
                uploadFiles.length > 0
                  ? "cursor-pointer hover:bg-gray-100 transition-colors"
                  : "cursor-not-allowed opacity-50"
              }`}
              style={{ backgroundColor: "rgba(241, 245, 249, 1)" }}
            >
              <Sparkles className="w-8 h-8 text-gray-600" />
            </div>
            <h3
              onClick={uploadFiles.length > 0 ? handleProcess : undefined}
              className={`text-lg font-medium mb-2 ${
                uploadFiles.length > 0
                  ? "cursor-pointer hover:text-blue-600"
                  : "cursor-not-allowed"
              }`}
              style={{ color: "rgba(7, 11, 17, 1)" }}
            >
              Specs获取
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "rgba(136, 138, 139, 1)" }}
            >
              点击开始处理文件，AI将为您生成总结和分析
            </p>
            <button
              onClick={handleProcess}
              disabled={uploadFiles.length === 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              开始处理
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </>
        )}

        {currentStep === "process" && (
          <>
            <Loader className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-sm" style={{ color: "rgba(136, 138, 139, 1)" }}>
              AI正在分析和总结您的文件内容
            </p>
          </>
        )}

        {currentStep === "complete" && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: "rgba(7, 11, 17, 1)" }}
            >
              处理完成
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "rgba(136, 138, 139, 1)" }}
            >
              所有文件已成功处理，选择您要进行的操作
            </p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  // 重新处理逻辑
                  setCurrentStep("upload");
                  setProcessingFiles([]);
                }}
                className="inline-flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                title="重新处理"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <div className="inline-flex">
                <button
                  onClick={async () => {
                    try {
                      const completedFiles = processingFiles.filter(
                        (f) => f.processingState === "completed"
                      );

                      if (completedFiles.length === 0) {
                        alert("没有已完成的文件可供应用");
                        return;
                      }

                      // 获取第一个完成的文件的specs数据
                      const firstFile = completedFiles[0];
                      if (
                        !firstFile.result?.specsFile ||
                        !firstFile.result?.specsFileName
                      ) {
                        alert("specs数据未生成");
                        return;
                      }

                      // 跳转到specs详情页面，通过state传递数据
                      // 直接复制specs文件的JSON内容到剪贴板
                      const specsContent = JSON.stringify(firstFile.result?.specsFile, null, 2);
                      await navigator.clipboard.writeText(specsContent);

                      // 显示成功提示
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                    } catch (error) {
                      console.error("应用失败:", error);
                      alert("应用失败，请重试");
                    }
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors mr-3"
                  title="应用到新对话"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    try {
                      // 下载.specs文件
                      const completedFiles = processingFiles.filter(
                        (f) => f.processingState === "completed"
                      );

                      if (completedFiles.length === 0) {
                        alert("没有已完成的文件可供下载");
                        return;
                      }

                      completedFiles.forEach((file) => {
                        if (
                          file.result?.specsFile &&
                          file.result?.specsFileName
                        ) {
                          downloadSpecsFile(
                            file.result.specsFile,
                            file.result.specsFileName
                          );
                        }
                      });

                      // 显示成功提示
                      console.log(
                        `成功下载 ${completedFiles.length} 个.specs文件`
                      );
                    } catch (error) {
                      console.error("下载文件失败:", error);
                      alert("下载文件失败，请重试");
                    }
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors mr-3"
                  title="下载.specs文件"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    try {
                      // 上传.specs文件到后端
                      const completedFiles = processingFiles.filter(
                        (f) => f.processingState === "completed"
                      );

                      if (completedFiles.length === 0) {
                        alert("没有已完成的文件可供上传");
                        return;
                      }

                      const firstFile = completedFiles[0];
                      if (
                        !firstFile.result?.specsFile ||
                        !firstFile.result?.specsFileName
                      ) {
                        alert("specs数据未生成");
                        return;
                      }

                      // 将specs数据转为Blob
                      const specsBlob = new Blob(
                        [JSON.stringify(firstFile.result.specsFile, null, 2)],
                        { type: "application/json" }
                      );

                      // 创建FormData
                      const formData = new FormData();
                      formData.append(
                        "file",
                        specsBlob,
                        firstFile.result.specsFileName
                      );

                      // 上传到后端
                      const token = localStorage.getItem("authToken");
                      if (!token) {
                        alert("未登录，请先登录");
                        return;
                      }

                      const API_BASE_URL =
                        import.meta.env.VITE_API_BASE_URL ||
                        "http://localhost:5001";
                      const response = await fetch(
                        `${API_BASE_URL}/api/upload`,
                        {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                          body: formData,
                        }
                      );

                      if (!response.ok) {
                        throw new Error(`上传失败: ${response.status}`);
                      }

                      const result = await response.json();
                      console.log("上传成功:", result);

                      // 显示成功提示
                      alert(
                        `文件上传成功！文件名: ${result.file_info.saved_name}`
                      );
                    } catch (error) {
                      console.error("上传文件失败:", error);
                      alert("上传文件失败，请重试");
                    }
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                  title="上传到服务器"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // 极简显示：只显示文件名和JSON文本
  const renderStructuredSpecs = (specsFile: any) => {
    if (!specsFile) return <div className="text-gray-500">无分析结果</div>;

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700">JSON内容:</div>
        <textarea
          className="w-full h-96 p-3 border border-gray-300 rounded font-mono text-xs"
          value={JSON.stringify(specsFile, null, 2)}
          readOnly
        />
      </div>
    );
  };

  const renderResultSection = () => (
    <div className="flex-1 p-6 border-l border-gray-200">
      <h3
        className="text-lg font-medium mb-4"
        style={{ color: "rgba(7, 11, 17, 1)" }}
      >
        处理结果
      </h3>

      {processingFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText className="w-12 h-12 mb-4 text-gray-400" />
          <p className="text-sm" style={{ color: "rgba(136, 138, 139, 1)" }}>
            处理完成后，结果将在这里显示
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {processingFiles.map((file, index) => (
            <div key={index} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-sm">
                    {file?.name || "未知文件"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {file.processingState === "generating" && (
                    <span className="flex items-center text-xs text-blue-600">
                      <Loader className="w-3 h-3 mr-1 animate-spin" />
                      生成中...
                    </span>
                  )}
                  {file.processingState === "processing" && (
                    <span className="flex items-center text-xs text-blue-600">
                      <Clock className="w-3 h-3 mr-1" />
                      处理中...
                    </span>
                  )}
                  {file.processingState === "completed" && (
                    <span className="flex items-center text-xs text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已完成
                    </span>
                  )}
                  {file.processingState === "error" && (
                    <span className="flex items-center text-xs text-red-600">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      处理失败
                    </span>
                  )}
                  <button
                    onClick={() => removeProcessingFile(index)}
                    className="hover:bg-gray-200 p-1 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {file.result && (
                <div
                  className="text-xs space-y-3"
                  style={{ color: "rgba(136, 138, 139, 1)" }}
                >
                  {/* 基本信息 */}
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      .specs文件: {file.result.specsFileName}
                    </span>
                    <span>
                      处理时间: {(file.result.processingTime / 1000).toFixed(1)}
                      s
                    </span>
                  </div>

                  {/* 显示解析结果 */}
                  <div>
                    <div className="font-medium text-gray-700 mb-2 flex items-center">
                      解析结果
                      {(file.result.contextAnalysis as any)?.parsing_method && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {(file.result.contextAnalysis as any).parsing_method}
                        </span>
                      )}
                    </div>

                    {(() => {
                      const analysis = file.result.contextAnalysis;
                      if (!analysis)
                        return <div className="text-gray-500">无分析结果</div>;

                      const compressedContext = (analysis as any)
                        ?.compressed_context;
                      const parsingError = (analysis as any)?.parsing_error;
                      const rawResponse = (analysis as any)?.raw_api_response;

                      // 🔧 优化：更灵活的显示逻辑，适应可选字段结构

                      // 如果有解析错误但有原始响应，显示降级信息
                      if (parsingError && rawResponse) {
                        return (
                          <div>
                            <div className="text-amber-600 text-sm mb-2">
                              解析为降级格式: {parsingError}
                            </div>
                            <div className="bg-amber-50 p-3 rounded border">
                              <div className="text-sm font-medium mb-2">
                                基础信息:
                              </div>
                              <div className="text-sm space-y-1">
                                <div>
                                  <strong>名称:</strong>{" "}
                                  {(analysis as any)?.metadata?.name ||
                                    "未命名"}
                                </div>
                                <div>
                                  <strong>类型:</strong>{" "}
                                  {(analysis as any)?.metadata?.task_type ||
                                    "general_chat"}
                                </div>
                                <div>
                                  <strong>处理方式:</strong> 降级解析
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 完全解析失败时显示原始响应
                      if (parsingError) {
                        return (
                          <div>
                            <div className="text-red-600 text-sm mb-2">
                              解析失败: {parsingError}
                            </div>
                            <div className="bg-gray-50 p-4 rounded border">
                              <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                                {rawResponse || "暂无响应内容"}
                              </pre>
                            </div>
                          </div>
                        );
                      }

                      // 显示结构化的specs内容
                      return renderStructuredSpecs(file.result.specsFile);
                    })()}
                  </div>
                  <div className="text-right text-gray-400">
                    {new Date(file.result.generatedAt).toLocaleTimeString()}
                  </div>
                </div>
              )}

              {file.processingState === "error" && file.error && (
                <p className="text-xs text-red-600">{file.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* 居中弹窗提示 */}
      {showToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900 mb-2">
                复制成功！
              </div>
              <div className="text-sm text-gray-600">
                复制到粘贴板了，发给其他ai无缝衔接吧～
              </div>
            </div>
          </div>
        </div>
      )}

      <Header
        isDarkMode={false}
        onToggleTheme={() => {}}
        user={user}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto p-6">
        {searchParams.get("id") && (
          <div className="flex justify-end mb-6">
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>上传成功 - ID: {searchParams.get("id")}</span>
            </div>
          </div>
        )}

        {renderStepIndicator()}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex h-[600px]">
            {renderUploadSection()}
            {renderProcessSection()}
            {renderResultSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
