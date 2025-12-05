"use client";

import { useState, useEffect, useRef } from "react";
import "./speech-input-button.css";
import Button from "@/components/button";
import { ButtonType } from "@/types";
import { pipeline } from "@huggingface/transformers";

/**
 * Props for the SpeechInputButton component.
 */
interface SpeechInputButtonProps {
  /**
   * 
   * @param transcription - The transcription of the audio
   * @returns 
   */
  onTranscription: (transcription: string) => void;

  /**
   * Whether the button is disabled.
   */
  disabled: boolean;
}

/**
 * Screen component that displays an input field with a microphone button inline,
 * and a dropdown below these elements.
 * Supports microphone recording and speech-to-text transcription using Hugging Face Whisper model.
 */
export default function SpeechInputButton({ onTranscription, disabled }: SpeechInputButtonProps) {
  // State for tracking if model has been loaded
  const [hasLoadedModel, setHasLoadedModel] = useState(false);
  // State for tracking if we're currently setting up recording (including model download)
  const [isSettingUpRecording, setIsSettingUpRecording] = useState(false);
  // State to track if recording is currently in progress
  const [isRecording, setIsRecording] = useState(false);
  // State to track when we're loading transcription
  const [isLoadingTranscription, setIsLoadingTranscription] = useState(false);
  
  // Ref to store the transcriber pipeline instance
  const transcriberRef = useRef<any>(null);
  // Ref to store the MediaRecorder instance
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // Ref to store audio chunks during recording
  const chunksRef = useRef<Blob[]>([]);

  const loadModel = async () => {
    const transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en",
      {
        dtype: "q8",
      }
    );
    transcriberRef.current = transcriber;
  }

  /**
   * Starts recording audio from the microphone.
   * Requests microphone access and begins recording audio chunks.
   */
  const startRecording = async () => {

    try {
      setIsSettingUpRecording(true);
      // Step 0 - if model has not yet been loaded then download it
      if (!hasLoadedModel) {
        await loadModel();
        setHasLoadedModel(true);
      }

      // Prevent starting if transcriber isn't ready or already recording
      if (!transcriberRef.current || isRecording) return;
      // Request access to the user's microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Create a MediaRecorder to capture audio
      const mediaRecorder = new MediaRecorder(stream);
      // Reset chunks array for new recording
      chunksRef.current = [];

      // Handle data available events - store audio chunks as they're recorded
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Handle recording stop event - transcribe the recorded audio
      mediaRecorder.onstop = async () => {
        try {
          // Combine all audio chunks into a single Blob
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          // Create a URL for the audio blob that Transformers.js can use
          const url = URL.createObjectURL(blob);

          // Run Whisper transcription on the audio (runs fully in browser)
          const result = await transcriberRef.current(url, {
            chunk_length_s: 30,
            stride_length_s: 5,
          });

          // Call parent component to let it know the transcription is ready
          onTranscription(result.text);

          // Clean up the object URL
          URL.revokeObjectURL(url);
          // Stop all media tracks to release microphone access
          stream.getTracks().forEach((t) => t.stop());
        } catch (error) {
          console.error("Failed to transcribe audio:", error);
        } finally {
          setIsLoadingTranscription(false);
        }
      };

      // Start recording
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
    } finally {
        setIsSettingUpRecording(false);
    }
  };

  /**
   * Stops the current recording session.
   * Triggers the onstop handler which will transcribe the audio.
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      setIsLoadingTranscription(true);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  /**
   * Handles clicks on the microphone button.
   * Toggles between starting and stopping recording based on current state.
   */
  const handleMicrophoneClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const tooltipText = () => {
    if (isSettingUpRecording && !hasLoadedModel) {
      return "Downloading speech to text model...";
    } else if (isSettingUpRecording) {
      return "Setting up microphone...";
    } else if (isLoadingTranscription) {
      return "Loading transcription...";
    } else if (isRecording) {
      return "Click to stop recording";
    } else {
      return "Click to record your voice and convert it to text";
    }
  }

  return (
    <div className={`microphone-button-wrapper ${isRecording ? "microphone-button-wrapper--recording" : ""}`}>
        <Button
            htmlType="button"
            type={ButtonType.PRIMARY}
            onClick={handleMicrophoneClick}
            className="microphone-button"
            disabled={isSettingUpRecording || isLoadingTranscription || disabled}
            tooltip={tooltipText()}
        > 
            {(isSettingUpRecording || isLoadingTranscription) ? (
            <div className="loading-spinner-icon"></div>
            ) : isRecording ? (
            <div className="recording-square-icon"></div>
            ) : (
            <svg 
                width="20" 
                height="20" 
                viewBox="-3 0 19 19" 
                xmlns="http://www.w3.org/2000/svg"
                className="microphone-icon"
            >
                <path d="M11.665 7.915v1.31a5.257 5.257 0 0 1-1.514 3.694 5.174 5.174 0 0 1-1.641 1.126 5.04 5.04 0 0 1-1.456.384v1.899h2.312a.554.554 0 0 1 0 1.108H3.634a.554.554 0 0 1 0-1.108h2.312v-1.899a5.045 5.045 0 0 1-1.456-.384 5.174 5.174 0 0 1-1.641-1.126 5.257 5.257 0 0 1-1.514-3.695v-1.31a.554.554 0 1 1 1.109 0v1.31a4.131 4.131 0 0 0 1.195 2.917 3.989 3.989 0 0 0 5.722 0 4.133 4.133 0 0 0 1.195-2.917v-1.31a.554.554 0 1 1 1.109 0zM3.77 10.37a2.875 2.875 0 0 1-.233-1.146V4.738A2.905 2.905 0 0 1 3.77 3.58a3 3 0 0 1 1.59-1.59 2.902 2.902 0 0 1 1.158-.233 2.865 2.865 0 0 1 1.152.233 2.977 2.977 0 0 1 1.793 2.748l-.012 4.487a2.958 2.958 0 0 1-.856 2.09 3.025 3.025 0 0 1-.937.634 2.865 2.865 0 0 1-1.152.233 2.905 2.905 0 0 1-1.158-.233A2.957 2.957 0 0 1 3.77 10.37z"/>
            </svg>
            )}
        </Button>
    </div>
  );
}

