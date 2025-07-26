/**
 * 用户上传文件API服务
 */

import type { UserUploadsResponse } from "@/types/context";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

class UploadsApiService {
  /**
   * 获取当前用户的上传文件列表
   */
  async getUserUploads(): Promise<UserUploadsResponse> {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("未找到认证令牌");
    }

    const response = await fetch(`${API_BASE_URL}/api/uploads/list`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("认证失败，请重新登录");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `请求失败: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 删除用户上传的文件
   */
  async deleteUserFile(timestamp: string): Promise<void> {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("未找到认证令牌");
    }

    const response = await fetch(`${API_BASE_URL}/api/uploads/${timestamp}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("认证失败，请重新登录");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `删除失败: ${response.status}`);
    }
  }

  /**
   * 获取文件的specs内容
   */
  async getFileSpecs(userUuid: string, timestamp: string): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/${userUuid}/${timestamp}.html`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `获取文件内容失败: ${response.status}`
      );
    }

    return response.json();
  }

  /**
   * 下载文件
   */
  async downloadFile(userUuid: string, fileName: string): Promise<Blob> {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("未找到认证令牌");
    }

    const response = await fetch(
      `${API_BASE_URL}/api/uploads/download/${userUuid}/${fileName}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("认证失败，请重新登录");
      }
      throw new Error(`下载失败: ${response.status}`);
    }

    return response.blob();
  }
}

export const uploadsApi = new UploadsApiService();
