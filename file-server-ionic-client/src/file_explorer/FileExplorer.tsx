import React, { useContext, useEffect, useRef, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonList, IonLoading,
  IonPage,
  IonTitle,
  IonToolbar,
  IonModal,
  IonButtons,
  IonButton,
  IonItem,
  useIonToast,
  IonChip,
  IonLabel,
  IonCheckbox,
  IonText
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { FileContext } from './FileProvider';
import { createFile, deleteFile, downloadFile } from './FileApi';
import { FileItem } from './FileItem';
import { OverlayEventDetail } from '@ionic/react/dist/types/components/react-component-lib/interfaces';
import { useAuth } from '../auth/AuthProvider';


const FileExplorer: React.FC<RouteComponentProps> = ({ history }) => {
    const { username, authDispatch } = useAuth();
    const { files, fetching, fetchingError, saving, savingError, saveItem } = useContext(FileContext);

    const [message, setMessage] = useState("");
    const [fileName, setFileName] = useState("");
    const [isPrivate, setIsPrivate] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const modal = useRef<HTMLIonModalElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [presentToast] = useIonToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {

      const file = e.target.files?.[0];
      if (file) {
        setFile(file);
        setFileName(file.name);
      }
    }

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const handleBrowseClick = () => {
      fileInputRef.current?.click();
    };

    const resetForm = () => {
      setFileName('');
      setIsPrivate(false);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const confirm = async () => {
        if (!fileName || !file) {
          presentToast({
            message: 'Please enter a file name and select a file',
            duration: 2000,
            color: 'warning'
          });
          return;
        }

        if (!saveItem) {
          presentToast({
            message: 'Save function not available',
            duration: 2000,
            color: 'danger'
          });
          return;
        }


        try {
          setIsUploading(true);
        
          await saveItem({
            id: '',
            fileName: fileName,
            file: file,
            size: file.size,
            contentType: file.type,
            visibility: isPrivate
          });      

          presentToast({
            message: 'File uploaded successfully!',
            duration: 2000,
            color: 'success'
          });
          
          resetForm();
          modal.current?.dismiss();
          
          // Optionally trigger a refresh of the file list
          // You might need to add a refresh method to your FileContext
          
        } catch (error: any) {
          presentToast({
            message: error?.message || 'Failed to upload file',
            duration: 3000,
            color: 'danger'
          });
        } finally {
          setIsUploading(false);
        }
      };

    function onWillDismiss(event: CustomEvent<OverlayEventDetail>) {
      if (event.detail.role === 'confirm') {
        setMessage(`Hello, ${event.detail.data}!`);
      }
    }

    
    if (fetching) {
      return (
        <div>Loading</div>
      );
    }

    if (!files || !Array.isArray(files)) {
      return (
        <IonPage>
          <IonHeader>
            <IonToolbar>
              <IonTitle>File Explorer</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonText color="medium">
              <p>No files found</p>
            </IonText>
          </IonContent>
        </IonPage>
      );
    }

    return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Item List</IonTitle>
          <IonButtons slot="end">
            <IonButton 
              onClick={() => authDispatch({ type: "LOGOUT", payload: { username: "", accessToken: null } })}
            >
              {username} Logout
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonLoading isOpen={fetching} message="Fetching files"/>
        {files && (
          <IonList>
            {files.map(({ id, fileName, contentType, size, visibility }) => 
              <FileItem 
                key={id} 
                id={id} 
                fileName={fileName} 
                contentType={contentType}
                size={size}
                visibility={visibility}
                onDownload={(id: string | undefined)  => { downloadFile(id) }} 
                onDelete={(id: string | undefined)  => { deleteFile(id) }}/>)
            }
          </IonList>
        )}
        {fetchingError && (
          <div>{fetchingError.message || 'Failed to fetch files'}</div>
        )}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton id="open-modal">
            <IonIcon icon={add}/>
          </IonFabButton>
        </IonFab>
      </IonContent>
      {/* Ion modal */}
      <IonModal ref={modal} trigger="open-modal" onWillDismiss={(event) => onWillDismiss(event)}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => modal.current?.dismiss()}>Cancel</IonButton>
              </IonButtons>
              <IonTitle>Upload file</IonTitle>
              <IonButtons slot="end">
                <IonButton 
                  strong={true} 
                  onClick={confirm}
                  disabled={!fileName || !file || isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem className="ion-margin-top">
            <div style={{ width: '100%', paddingTop: '8px', paddingBottom: '8px' }}>
              <IonLabel position="stacked">Select File</IonLabel>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <IonButton
                expand="block"
                fill="outline"
                onClick={handleBrowseClick}
                className="ion-margin-top"
              >
                <IonIcon slot="start" />
                Browse Files
              </IonButton>

              {file && (
                <IonChip color="primary" className="ion-margin-top">
                  <IonLabel>
                    {file.name} ({formatFileSize(file.size)})
                  </IonLabel>
                </IonChip>
              )}
            </div>
          </IonItem>
          <IonItem className="ion-margin-top" lines="none">
          <IonCheckbox
            checked={isPrivate}
            onIonChange={(e) => setIsPrivate(e.detail.checked)}
            slot="start"
          />
          <IonLabel>
            <h3>Private File</h3>
            <IonText color="medium">
              <p>Only you can access this file</p>
            </IonText>
          </IonLabel>
          </IonItem>
          </IonContent>
        </IonModal>
    </IonPage>
  );
};

export default FileExplorer;
