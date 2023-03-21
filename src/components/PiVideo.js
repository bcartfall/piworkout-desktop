/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-01-12
 * See README.md
 */

import React, { useRef, } from 'react';

import { Card, Box, CardContent, CardMedia, Typography, Chip, LinearProgress, Grow } from '@mui/material';
import { useDrag, useDrop } from 'react-dnd';
import { useNavigate } from "react-router-dom";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import eStatus from '../enums/VideoStatus';

export default function PiVideo({ video, controller, index, moveVideo, }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  
  const [{ handlerId }, drop] = useDrop({
    accept: 'PiVideo',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.currentIndex;
      const hoverIndex = index;
      
      // don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      // determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      // get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // determine mouse position
      const clientOffset = monitor.getClientOffset();

      // get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveVideo(item.video, hoverIndex, false);

      item.currentIndex = hoverIndex;
    },
    drop(item, monitor) {
      // item.video has moved to index item.index
      console.log('fromIndex=' + item.startIndex, 'toIndex=' + index);
      moveVideo(item.video, index, true);
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'PiVideo',
    item: () => {
      return { video, startIndex: index, currentIndex: index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.25 : 1
  drag(drop(ref))  

  const playVideo = (event) => {
    // PiVideo component has been clicked
    if (video.status === eStatus.COMPLETE) {
      navigate('/player/' + video.id);
    }
  };

  let status;
  switch (video.status) {
    case eStatus.INIT: status = 'Init'; break;
    case eStatus.DOWNLOADING_VIDEO: status = 'Downloading Video'; break;
    case eStatus.DOWNLOADING_AUDIO: status = 'Downloading Audio'; break;
    case eStatus.ENCODING: status = 'Encoding'; break;
    case eStatus.COMPLETE: status = 'Ready'; break;
    case eStatus.DELETED: status = 'Deleted'; break;
    default: status = 'Unknown';
  }

  let progress = 100, color;
  if (video.progress && video.progress.totalBytes) {
    // determine progress from how much has donwloaded
    progress = video.progress.progress * 100; // 0 to 100
    //console.log("downloading progress: " + progress, video.id, video.progress.downloadedBytes, video.progress.totalBytes)
    color = 'secondary';
  } else {
    // determine progress from how much we have watched
    progress = Math.round(video.position / video.duration * 10000) * 0.01;
    color = 'error';
  }
  progress = Math.min(100, Math.max(0, progress));

  let duration = '';
  let i = video.duration;
  const hours = Math.floor(i / 3600).toString(),
    minutes = Math.floor((i / 60) % 60).toString(),
    seconds = (i % 60).toString();
  if (hours > 0) {
    duration = hours.padStart(2, '0') + ':';
  }
  duration += minutes.padStart(2, '0') + ':' + seconds.padStart(2, '0');

  return (
    <div ref={ref} key={video.id} style={{ opacity }} data-handler-id={handlerId} onClick={playVideo}>
      <Grow key={video.id} in={true}>
        <Card sx={{ display: 'flex', mb: 2 }} className="piVideo">
          <Box sx={{ position: 'relative', width: '30%', display: 'inherited', flexDirection: 'column' }}>
            <Box className="cover">
              <Box className="center">
                <PlayArrowIcon fontSize="large" />
              </Box>
            </Box>
            <CardMedia
              component="img"
              image={controller.getVideoUrl(video.id + '-' + video.filename + ".jpg")}
              alt="{video.title}"
            />
            <Box sx={{ position: 'absolute', right: 8, bottom: 8, fontSize: '0.8rem', borderRadius: 2, backgroundColor: 'black', p: 0.25, pl: 0.75, pr: 0.75 }}>{duration}</Box>
          </Box>
          <Box sx={{ width: '70%', display: 'flex', flexDirection: 'column' }} className="content">
            <CardContent sx={{ flex: '1 0 auto' }}>
              <Typography component="div" className="title" variant="h6">
                {video.title}
              </Typography>
              <Chip label={status} variant="outlined" />
            </CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, pb: 1 }}>
              <Typography className="description" sx={{ overflow: 'hidden', maxHeight: 76, color: '#aaa' }}>
                {video.description}
              </Typography>
            </Box>
            {progress > 0 &&
              <LinearProgress className="videoPlayerProgress" color={color} variant="determinate" value={progress} />}
          </Box>
        </Card>
      </Grow>
    </div>
  );
}