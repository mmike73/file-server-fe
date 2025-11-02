import { IonButton, IonItem, IonLabel } from "@ionic/react";
import { FileProps } from "./FileProvider";

interface FilePropsExt extends FileProps {
  onDownload: (id?: string) => void;
  onDelete: (id?: string) => void;
}

export const FileItem: React.FC<FilePropsExt> = ({ id, fileName, size, visibility, contentType, onDownload, onDelete}) => {
  return (
    <>
    <IonItem>
      <IonLabel>{fileName}</IonLabel>
      <IonLabel>{size}</IonLabel>
      <IonLabel>{(visibility == false) ? ("Private") : ("Public")}</IonLabel>
      <IonButton onClick={() => onDelete(id)}>Delete</IonButton>
      <IonButton onClick={() => onDownload(id)}>Download</IonButton>
    </IonItem>
    </>
  );
};