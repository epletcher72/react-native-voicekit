import { useCallback, useEffect, useState } from 'react';
import RNVoiceKit from '../voice-kit';
import { VoiceEvent, type VoiceStartListeningOptions } from '../types/main';

interface UseVoiceProps extends VoiceStartListeningOptions {
  /** Whether to update the transcript on partial results. Defaults to false. */
  enablePartialResults?: boolean;
  /** 
   * Callback to receive PCM16 audio frames (16-bit signed integers in range -32768 to 32767).
   * Note: The actual sample rate depends on the device hardware and may differ from the requested rate.
   */
  onAudioBuffer?: (frame: number[]) => void;
}

export function useVoice(props?: UseVoiceProps) {
  const { enablePartialResults = false, onAudioBuffer, ...listeningOptions } = props ?? {};

  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string>('');

  const handleAvailabilityChanged = useCallback((newAvailable: boolean) => {
    setAvailable(newAvailable);
  }, []);

  const handleListeningStateChanged = useCallback((newListening: boolean) => {
    setListening(newListening);
  }, []);

  const handlePartialResult = useCallback(
    (newPartialResult: string) => {
      if (!enablePartialResults) return;
      setTranscript(newPartialResult);
    },
    [enablePartialResults]
  );

  const handleFinalResult = useCallback((newFinalResult: string) => {
    setTranscript(newFinalResult);
  }, []);

  const handleAudioBuffer = useCallback(
    (frame: number[]) => {
      onAudioBuffer?.(frame);
    },
    [onAudioBuffer]
  );

  const startListening = useCallback(() => {
    return RNVoiceKit.startListening({
      ...listeningOptions,
      enableAudioBuffer: !!onAudioBuffer,
    });
  }, [listeningOptions, onAudioBuffer]);

  const stopListening = useCallback(() => {
    return RNVoiceKit.stopListening();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  useEffect(() => {
    // Get initial availability status
    RNVoiceKit.isAvailable().then(handleAvailabilityChanged);

    // Set up listeners
    RNVoiceKit.addListener(VoiceEvent.AvailabilityChange, handleAvailabilityChanged);
    RNVoiceKit.addListener(VoiceEvent.ListeningStateChange, handleListeningStateChanged);
    RNVoiceKit.addListener(VoiceEvent.PartialResult, handlePartialResult);
    RNVoiceKit.addListener(VoiceEvent.Result, handleFinalResult);

    // Only add audio buffer listener if callback is provided
    if (onAudioBuffer) {
      RNVoiceKit.addListener(VoiceEvent.AudioBuffer, handleAudioBuffer);
    }

    return () => {
      // Clean up listeners
      RNVoiceKit.removeListener(VoiceEvent.AvailabilityChange, handleAvailabilityChanged);
      RNVoiceKit.removeListener(VoiceEvent.ListeningStateChange, handleListeningStateChanged);
      RNVoiceKit.removeListener(VoiceEvent.PartialResult, handlePartialResult);
      RNVoiceKit.removeListener(VoiceEvent.Result, handleFinalResult);

      // Only remove audio buffer listener if it was added
      if (onAudioBuffer) {
        RNVoiceKit.removeListener(VoiceEvent.AudioBuffer, handleAudioBuffer);
      }
    };
  }, [
    handleAvailabilityChanged,
    handleListeningStateChanged,
    handlePartialResult,
    handleFinalResult,
    handleAudioBuffer,
    onAudioBuffer,
  ]);

  return {
    available,
    listening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  };
}
