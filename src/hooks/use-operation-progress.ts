"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OperationProgressModalState } from "@/components/ui/operation-progress-modal";

export type OperationProgressStep = {
  label: string;
  percent: number;
};

export type OperationProgressConfig = {
  title: string;
  steps: OperationProgressStep[];
};

type InternalProgressState = OperationProgressModalState & {
  steps: OperationProgressStep[];
};

const INITIAL_STATE: InternalProgressState = {
  visible: false,
  title: "",
  stepLabel: "",
  percent: 0,
  status: "idle",
  message: undefined,
  steps: [],
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stepForPercent(steps: OperationProgressStep[], percent: number): OperationProgressStep | undefined {
  return [...steps].reverse().find((step) => percent >= step.percent) ?? steps[0];
}

export function useOperationProgress() {
  const [state, setState] = useState<InternalProgressState>(INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    intervalRef.current = setInterval(() => {
      setState((current) => {
        if (current.status !== "running" || current.percent >= 85) return current;

        const nextPercent = clampPercent(Math.min(85, current.percent + 3));
        const matchedStep = stepForPercent(current.steps, nextPercent);

        return {
          ...current,
          percent: nextPercent,
          stepLabel: matchedStep?.label ?? current.stepLabel,
        };
      });
    }, 900);
  }, [stopTimer]);

  useEffect(() => stopTimer, [stopTimer]);

  const startProgress = useCallback(
    (config: OperationProgressConfig) => {
      const firstStep = config.steps[0] ?? { label: "开始处理", percent: 5 };
      setState({
        visible: true,
        title: config.title,
        stepLabel: firstStep.label,
        percent: clampPercent(firstStep.percent),
        status: "running",
        message: undefined,
        steps: config.steps,
      });
      startTimer();
    },
    [startTimer],
  );

  const setStep = useCallback((stepLabel: string, percent: number) => {
    setState((current) => ({
      ...current,
      visible: true,
      stepLabel,
      percent: clampPercent(Math.min(percent, current.status === "running" ? 95 : 100)),
      message: undefined,
    }));
  }, []);

  const completeProgress = useCallback(
    (message = "已完成") => {
      stopTimer();
      setState((current) => ({
        ...current,
        visible: true,
        stepLabel: "完成",
        percent: 100,
        status: "success",
        message,
      }));
    },
    [stopTimer],
  );

  const failProgress = useCallback(
    (message: string) => {
      stopTimer();
      setState((current) => ({
        ...current,
        visible: true,
        status: "failed",
        message,
      }));
    },
    [stopTimer],
  );

  const resetProgress = useCallback(() => {
    stopTimer();
    setState(INITIAL_STATE);
  }, [stopTimer]);

  const hideProgress = useCallback(() => {
    setState((current) => ({
      ...current,
      visible: false,
    }));
  }, []);

  const modalState = useMemo<OperationProgressModalState>(
    () => ({
      visible: state.visible,
      title: state.title,
      stepLabel: state.stepLabel,
      percent: state.percent,
      status: state.status,
      message: state.message,
    }),
    [state.message, state.percent, state.status, state.stepLabel, state.title, state.visible],
  );

  return {
    progress: modalState,
    startProgress,
    setStep,
    completeProgress,
    failProgress,
    resetProgress,
    hideProgress,
  };
}
