import { DolphinLaunchType } from "@dolphin/types";
import create from "zustand";
import { combine } from "zustand/middleware";

import { useAccount } from "@/lib/hooks/useAccount";
import { useToasts } from "@/lib/hooks/useToasts";
import { useServices } from "@/services";
import type { AuthUser } from "@/services/auth/types";

import { useDesktopApp } from "./useQuickStart";

const log = window.electron.log;

export const useAppStore = create(
  combine(
    {
      initializing: false,
      initialized: false,
      logMessage: "",
      updateVersion: "",
      updateDownloadProgress: 0,
      updateReady: false,
    },
    (set) => ({
      setInitializing: (initializing: boolean) => set({ initializing }),
      setInitialized: (initialized: boolean) => set({ initialized }),
      setLogMessage: (logMessage: string) => set({ logMessage }),
      setUpdateVersion: (updateVersion: string) => set({ updateVersion }),
      setUpdateDownloadProgress: (updateDownloadProgress: number) => set({ updateDownloadProgress }),
      setUpdateReady: (updateReady: boolean) => set({ updateReady }),
    }),
  ),
);

export const useAppInitialization = () => {
  const { authService, slippiBackendService } = useServices();
  const { showError } = useToasts();
  const initializing = useAppStore((store) => store.initializing);
  const initialized = useAppStore((store) => store.initialized);
  const setInitializing = useAppStore((store) => store.setInitializing);
  const setInitialized = useAppStore((store) => store.setInitialized);
  const setLogMessage = useAppStore((store) => store.setLogMessage);
  const setPlayKey = useAccount((store) => store.setPlayKey);
  const setUser = useAccount((store) => store.setUser);
  const setServerError = useAccount((store) => store.setServerError);
  const setDesktopAppExists = useDesktopApp((store) => store.setExists);
  const setDesktopAppDolphinPath = useDesktopApp((store) => store.setDolphinPath);

  const initialize = async () => {
    if (initializing || initialized) {
      return;
    }

    setInitializing(true);

    console.log("Initializing app...");

    let user: AuthUser | null = null;
    try {
      user = await authService.init();
      setUser(user);
    } catch (err) {
      console.warn(err);
    }

    const promises: Promise<any>[] = [];

    // If we're logged in, check they have a valid play key
    if (user) {
      promises.push(
        slippiBackendService
          .fetchPlayKey()
          .then((key) => {
            setServerError(false);
            setPlayKey(key);
          })
          .catch((err) => {
            setServerError(true);
            console.warn(err);

            const message = `Failed to communicate with Slippi servers. You either have no internet
              connection or Slippi is experiencing some downtime. Playing online may or may not work.`;
            showError(message);
          }),
      );
    }

    // Download Dolphin if necessary
    promises.push(
      (async () => {
        try {
          await window.electron.dolphin.downloadDolphin(DolphinLaunchType.NETPLAY);
          await window.electron.dolphin.downloadDolphin(DolphinLaunchType.PLAYBACK);
        } catch (err) {
          const errMsg = "Error occurred while downloading Dolphin";
          log.error(errMsg, err);
          setLogMessage(errMsg);
        }
      })(),
    );

    promises.push(
      window.electron.dolphin
        .checkDesktopAppDolphin()
        .then(({ exists, dolphinPath }) => {
          setDesktopAppExists(exists);
          setDesktopAppDolphinPath(dolphinPath);
        })
        .catch(console.error),
    );

    // Check if there is an update to the launcher
    promises.push(window.electron.common.checkForAppUpdates());

    // Wait for all the promises to complete before completing
    try {
      await Promise.all(promises);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialized(true);
    }
  };

  return initialize;
};
