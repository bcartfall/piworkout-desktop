/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-01-12
 * See README.md
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

import './App.css';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";
import { CircularProgress, Typography } from '@mui/material';

import Layout from './pages/Layout';
import Main from './pages/Main';
import Settings from './pages/Settings';
import Player from './pages/Player';
import { defaultSnack, Controller } from './controllers/Controller';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export default function App(props) {
  const [layout, setLayout] = useState({
    snack: { ...defaultSnack },
    title: '',
  });

  const [connected, setConnected] = useState(false);
  const [failedToConnect, setFailedToConnect] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({
    audioDelay: '',
    networkDelay: '',
    videoQuality: '',
    playlistUrl: '',
    youtubeCookie: '',
  });
  const [videos, setVideos] = useState([]);

  // control layout and provide access to websocket server
  const controller = useRef();

  const onKeyDown = useCallback((event) => {
    return controller.current.onKeydown(event);
  }, [controller]);

  useEffect(() => {
    if (!controller.current) {
      // setup controller
      const isElectron = true;
      controller.current = new Controller({ layout, setLayout, settings, setSettings, videos, setVideos, setConnected, setLoaded, isElectron });

      controller.current.getClient().onFailedToConnect(() => {
        console.log('setting on failed to connect');
        setFailedToConnect(true);
      });
    }
  }, [controller, layout, settings, videos, setFailedToConnect, ]);

  useEffect(() => {
      // listen to keyevents
      document.addEventListener('keydown', onKeyDown, true);

      return () => {
        // cleanup events
        //console.log('cleanup');
        document.removeEventListener('keydown', onKeyDown, true);
      };
  }, [onKeyDown]);

  let routes = '';

  if (loaded || failedToConnect) {
    routes = (
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout layout={layout} controller={controller.current} />}>
            <Route index element={<Main controller={controller.current} connected={connected} videos={videos} failedToConnect={failedToConnect} />} />
            <Route path="settings" element={<Settings controller={controller.current} settings={settings} setFailedToConnect={setFailedToConnect} />} />
            <Route path="player/:id" element={<Player controller={controller.current} connected={connected} />} />
            <Route path="*" element={<Main controller={controller.current} connected={connected} videos={videos} failedToConnect={failedToConnect} />} />
          </Route>
        </Routes>
      </HashRouter>
    );
  } else {
    routes = (
      <>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          Loading...
        </Typography>
      </>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div className="app">
          {routes}
        </div>
      </ThemeProvider>
    </DndProvider>
  );
}