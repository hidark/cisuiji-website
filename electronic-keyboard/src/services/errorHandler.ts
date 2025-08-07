export enum ErrorType {
  AUDIO_LOAD_ERROR = 'AUDIO_LOAD_ERROR',
  MIDI_LOAD_ERROR = 'MIDI_LOAD_ERROR',
  PLAYBACK_ERROR = 'PLAYBACK_ERROR',
  ANALYSIS_ERROR = 'ANALYSIS_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: unknown;
  timestamp: Date;
  recoverable: boolean;
}

class ErrorHandler {
  private errorListeners: Set<(error: AppError) => void> = new Set();
  private errorLog: AppError[] = [];
  private maxLogSize = 50;

  public handleError(error: Error | AppError, type: ErrorType = ErrorType.UNKNOWN_ERROR): void {
    const appError: AppError = this.isAppError(error) ? error : {
      type,
      message: error.message || '发生了未知错误',
      details: error.stack || error,
      timestamp: new Date(),
      recoverable: this.isRecoverable(type)
    };

    // Log error
    this.logError(appError);

    // Notify listeners
    this.notifyListeners(appError);

    // Console error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorHandler]', appError);
    }
  }

  public handleAudioError(error: Error): void {
    this.handleError(error, ErrorType.AUDIO_LOAD_ERROR);
  }

  public handleMidiError(error: Error): void {
    this.handleError(error, ErrorType.MIDI_LOAD_ERROR);
  }

  public handlePlaybackError(error: Error): void {
    this.handleError(error, ErrorType.PLAYBACK_ERROR);
  }

  public handleAnalysisError(error: Error): void {
    this.handleError(error, ErrorType.ANALYSIS_ERROR);
  }

  public handleNetworkError(error: Error): void {
    this.handleError(error, ErrorType.NETWORK_ERROR);
  }

  public handlePermissionError(error: Error): void {
    this.handleError(error, ErrorType.PERMISSION_ERROR);
  }

  public addErrorListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  public clearErrorLog(): void {
    this.errorLog = [];
  }

  private isAppError(error: unknown): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'message' in error;
  }

  private isRecoverable(type: ErrorType): boolean {
    switch (type) {
      case ErrorType.AUDIO_LOAD_ERROR:
      case ErrorType.MIDI_LOAD_ERROR:
      case ErrorType.ANALYSIS_ERROR:
      case ErrorType.NETWORK_ERROR:
        return true;
      case ErrorType.PERMISSION_ERROR:
      case ErrorType.PLAYBACK_ERROR:
      case ErrorType.UNKNOWN_ERROR:
      default:
        return false;
    }
  }

  private logError(error: AppError): void {
    this.errorLog.push(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  public createErrorMessage(type: ErrorType, details?: string): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.AUDIO_LOAD_ERROR]: '音频文件加载失败',
      [ErrorType.MIDI_LOAD_ERROR]: 'MIDI文件加载失败',
      [ErrorType.PLAYBACK_ERROR]: '播放出现错误',
      [ErrorType.ANALYSIS_ERROR]: '音频分析失败',
      [ErrorType.NETWORK_ERROR]: '网络连接错误',
      [ErrorType.PERMISSION_ERROR]: '权限不足',
      [ErrorType.UNKNOWN_ERROR]: '发生未知错误'
    };

    const baseMessage = messages[type];
    return details ? `${baseMessage}: ${details}` : baseMessage;
  }
}

export const errorHandler = new ErrorHandler();

// Async error wrapper
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorType: ErrorType = ErrorType.UNKNOWN_ERROR
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler.handleError(error as Error, errorType);
      throw error;
    }
  }) as T;
}

// Sync error wrapper
export function withSyncErrorHandling<T extends (...args: unknown[]) => unknown>(
  fn: T,
  errorType: ErrorType = ErrorType.UNKNOWN_ERROR
): T {
  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      errorHandler.handleError(error as Error, errorType);
      throw error;
    }
  }) as T;
}