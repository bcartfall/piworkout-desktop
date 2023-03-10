/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-01-12
 * See README.md
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Divider, Typography, TextField, Select, Grid, MenuItem, FormControl, InputLabel, Grow, CircularProgress, Alert } from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SaveIcon from '@mui/icons-material/Save';

export default function Settings(props) {
  const navigate = useNavigate();

  const { settings, controller } = props;

  const [hasBackendFailure, setHasBackendFailure] = useState(controller.getClient().getHasBackendFailure());
  const [connecting, setConnecting] = useState(false);
  const [backendHost, setBackendHost] = useState(controller.getLocalSettings('backendHost', 'localhost:5000'));
  const [error, setError] = useState(null);

  useEffect(() => {
    // update title
    controller.setTitle('Settings');
  }, [controller]);

  const onChange = (name, value) => {
    let t = { ...settings };
    t[name] = value;
    controller.setSettings(t);
  };

  const onSubmit = () => {
    if (!hasBackendFailure) {
      // send to server
      controller.send({
        'namespace': 'settings',
        'method': 'PUT',
        'data': { ...settings },
      });
    }

    if (backendHost !== controller.getLocalSettings('backendHost')) {
      // attempt to connect to websocket and wait for init message
      setConnecting(true);

      controller.getClient().setup(backendHost).then(() => {
        // success
        setError(null);
        setConnecting(false);
        setHasBackendFailure(false);
        props.setFailedToConnect(false);

        // save
        controller.setLocalSettings('backendHost', backendHost);
      }).catch((response) => {
        // failed to connect
        setConnecting(false);
        setHasBackendFailure(true);
        setError('Error connecting to web socket at ' + backendHost + '.');
      });
      return;
    }

    controller.snack({
      message: 'Settings updated.',
    });
    navigate(-1);
  };

  const onDisconnect = () => {
    controller.send({
      'namespace': 'connect',
      'method': 'DELETE',
    });

    navigate('/');
  };


  if (connecting) {
    return (
      <>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          Attempting to connect to backend...
        </Typography>
      </>
    );
  }

  if (hasBackendFailure) {
    return (
      <Grow in={true}>
        <div className="page">
          <form onSubmit={onSubmit}>
            {error && <Alert severity="info" sx={{ mb: 2 }}>
              {error}
            </Alert>}
            <Typography variant="h4">
              Configure Backend
            </Typography>
            <Divider sx={{ m: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth required label="Backend Host" value={backendHost} onChange={(e) => setBackendHost(e.target.value)} />
              </Grid>
            </Grid>
            <Button variant="contained" sx={{ mt: 2 }} fullWidth onClick={onSubmit}><SaveIcon sx={{ mr: 0.5 }} /> Save Settings</Button>
          </form>
        </div>
      </Grow>
    );
  }

  return (
    <Grow in={true}>
      <div className="page">
        <form onSubmit={onSubmit}>
          <Typography variant="h4">
            Manage Server and Client Settings
          </Typography>
          <Divider sx={{ m: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label="Backend Host" value={backendHost} onChange={(e) => setBackendHost(e.target.value)} />
            </Grid>
          </Grid>
          <Divider sx={{ m: 2 }} />
          <Typography variant="">
            Disconnect from the YouTube API to connect with another account or refresh the access token.
            <Button variant="outlined" size="small" color="error" sx={{ ml: 2 }} onClick={onDisconnect}><CloudOffIcon sx={{ mr: 0.5 }} /> Disconnect From YouTube API</Button>
          </Typography>
          <Divider sx={{ m: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth required label="Audio Delay (ms)" value={settings.audioDelay} onChange={(e) => onChange('audioDelay', e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Select Video Quality *</InputLabel>
                <Select fullWidth required label="Select Video Quality *" value={settings.videoQuality} onChange={(e) => onChange('videoQuality', e.target.value)}>
                  <MenuItem value="720p">720p</MenuItem>
                  <MenuItem value="1080p">1080p</MenuItem>
                  <MenuItem value="1440p">1440p</MenuItem>
                  <MenuItem value="4K">4K</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Play List URL" value={settings.playlistUrl} onChange={(e) => onChange('playlistUrl', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="YouTube Cookie" multiline rows={4} fullWidth value={settings.youtubeCookie} onChange={(e) => onChange('youtubeCookie', e.target.value)} />
              <a href="https://github.com/dandv/convert-chrome-cookies-to-netscape-format" target="_blank" rel="noreferrer">How To Copy Cookies</a> | <a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a>
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 2 }} fullWidth onClick={onSubmit}><SaveIcon sx={{ mr: 0.5 }} /> Save Settings</Button>
        </form>
      </div>
    </Grow>
  );
}
