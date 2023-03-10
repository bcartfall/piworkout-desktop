/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-01-12
 * See README.md
 */

import React, { useEffect } from 'react';
import { Alert, Button } from '@mui/material';
import PiVideo from '../components/PiVideo';
import SettingsIcon from '@mui/icons-material/Settings';
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import YouTubeIcon from '@mui/icons-material/YouTube';

export default function Main({ controller, videos, connected, failedToConnect }) {
  const navigate = useNavigate();

  const [searchParams, ] = useSearchParams();

  useEffect(() => {
    // check if we need to redirect to settings page
    const localSettings = controller.getLocalSettings();
    if (!localSettings.backendHost) {
      navigate('/settings');
    }

    // update title
    controller.setTitle('');
  }, [controller, navigate, searchParams]);

  const onConnect = () => {
    // send request to get redirect url
    controller.send({
      'namespace': 'connect',
      'method': 'GET',
      'action': 'authorizationUrl',
      'redirectUri': controller.getUrl(''), // will open browser to backend
    });
  };

  let connectElement = '';
  if (!connected) {
    connectElement = (
      <Alert severity="info" sx={{ mb: 2 }} action={
        <Button variant="contained" size="small" onClick={onConnect}>
          <YouTubeIcon fontSize="small" sx={{ mr: 0.5 }} />
          Connect Now
        </Button>
      }>
        You are not connected with the YouTube API.
      </Alert>
    );
  }

  let videoElement;
  if (!videos.length) {
    videoElement = (
      <Alert severity="warning" action={
        <Link to="/settings" className="link">
          <Button variant="outlined" size="small">
            <SettingsIcon fontSize="small" sx={{ mr: 0.5 }} /> Settings
          </Button>
        </Link>
      }>
        No videos found. Make sure you have set a Playlist URL in settings.
      </Alert>
    );
  } else {
    // list of videos
    videoElement = videos.map((video) => {
      if (video.title) {
        // must have a title
        return <PiVideo key={video.id} video={video} controller={controller} />;
      }
      return '';
    });
  }

  return (
    <div className="page">
      {failedToConnect && 
        <Alert severity="error" action={
          <Link to="/settings" className="link">
            <Button variant="outlined" size="small">
              <SettingsIcon fontSize="small" sx={{ mr: 0.5 }} /> Settings
            </Button>
          </Link>
        }>
          Failed to connect to server.
        </Alert>
      }
      {!failedToConnect &&
        <>
          {connectElement}
          {videoElement}
        </>
      }
    </div>
  );
}