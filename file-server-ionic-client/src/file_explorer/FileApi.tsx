import { fileServerAxios } from "../api/FileServerAxios";
import { FileProps } from "./FileProvider";

export const getFiles = async () : Promise<FileProps[]> => {
    return (await fileServerAxios.get("/api/FileEntry/all-public")).data;
}

export const getPrivateFiles = async () : Promise<FileProps[]> => {
    return (await fileServerAxios.get("/api/FileEntry/all-private")).data;
}

export const createFile = async (item: FileProps) : Promise<FileProps> => {
    const formData = new FormData();
    if (item.file) {
        formData.append("File", item.file);
        formData.append("FileName", item.fileName);
        formData.append("Size", item.size.toString());
        formData.append("FileName", item.fileName);
        formData.append("ContentType", item.contentType);
        formData.append("Visibility", (item.visibility === false) ? "Public" : "Private");
    }
    return await fileServerAxios.post("/api/FileEntry", formData);
}

export const deleteFile = async (fileId: string | undefined) : Promise<FileProps> => {
    return await fileServerAxios.delete(`/api/FileEntry/${fileId}`);
}


export const downloadFile = async (fileId: string | undefined) => {
    if (!fileId) {
        console.error("No file ID provided");
        return;
    }

    try {
        const fileMetadataResponse = await fileServerAxios.get(`/api/FileEntry/${fileId}`);

        const response = await fileServerAxios.get(`/api/FileEntry/${fileId}/download`, {
            responseType: "blob"
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");

        const contentDisposition = response.headers["content-disposition"];
        let fileName = fileMetadataResponse.data.originalName;
        
        if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                fileName = match[1].replace(/['"]/g, '');
            }
        }

        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
    } catch (err: any) {
        console.error("Download failed:", err?.response?.data || err?.message || err);
        
        if (err?.response?.status === 401) {
            alert("Please log in to download this file");
        } else if (err?.response?.status === 404) {
            alert("File not found");
        } else {
            alert("Failed to download file. Please try again.");
        }
    }
}

// interface MessageData {
//   event: string;
//   payload: {
//     item: FileProps;
//   };
// }


// export const newWebSocket = (onMessage: (data: MessageData) => void) => {
//   const ws = new WebSocket(`ws://${baseUrl}`)
//   ws.onopen = () => {
//     log('web socket onopen');
//   };
//   ws.onclose = () => {
//     log('web socket onclose');
//   };
//   ws.onerror = error => {
//     log('web socket onerror', error);
//   };
//   ws.onmessage = messageEvent => {
//     log('web socket onmessage');
//     onMessage(JSON.parse(messageEvent.data));
//   };
//   return () => {
//     ws.close();
//   }
// }
