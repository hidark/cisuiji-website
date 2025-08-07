import { useRef, FC } from 'react';
import { UploadIcon, LoadingIcon } from '../Icons';
import styles from './MidiControls.module.css';

interface FileUploaderProps {
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile: File | null;
  isLoading: boolean;
  disabled?: boolean;
}

export const FileUploader: FC<FileUploaderProps> = ({ 
  onFileSelect, 
  selectedFile, 
  isLoading,
  disabled = false 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.uploadSection}>
      <input
        type="file"
        accept=".mid,.midi"
        onChange={onFileSelect}
        ref={fileInputRef}
        style={{ display: 'none' }}
        disabled={disabled || isLoading}
      />
      
      <button 
        onClick={handleUploadClick}
        className={styles.uploadButton}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <>
            <LoadingIcon size={20} />
            <span>加载中...</span>
          </>
        ) : (
          <>
            <UploadIcon size={20} />
            <span>{selectedFile ? '更换' : '选择'}MIDI文件</span>
          </>
        )}
      </button>
      
      {selectedFile && !isLoading && (
        <div className={styles.fileName}>
          {selectedFile.name}
        </div>
      )}
    </div>
  );
};