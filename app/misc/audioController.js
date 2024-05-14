import { storeAudioForNextOpening } from './helper';

// play audio
export const play = async (playbackObj, uri, lastPosition) => {
  try {
    if (!lastPosition)
      return await playbackObj.loadAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 1000 }
      );

    // Play audio from the lastPosition if available
    await playbackObj.loadAsync(
      { uri },
      { progressUpdateIntervalMillis: 1000 }
    );

    return await playbackObj.playFromPositionAsync(lastPosition);
  } catch (error) {
    console.log('Error inside play helper method:', error.message);
  }
};

// pause audio
export const pause = async playbackObj => {
  try {
    return await playbackObj.setStatusAsync({
      shouldPlay: false,
    });
  } catch (error) {
    console.log('Error inside pause helper method:', error.message);
  }
};

// resume audio
export const resume = async playbackObj => {
  try {
    return await playbackObj.playAsync();
  } catch (error) {
    console.log('Error inside resume helper method:', error.message);
  }
};

// select another audio
export const playNext = async (playbackObj, uri) => {
  try {
    await playbackObj.stopAsync();
    await playbackObj.unloadAsync();
    return await play(playbackObj, uri);
  } catch (error) {
    console.log('Error inside playNext helper method:', error.message);
  }
};

export const selectAudio = async (audio, context, playListInfo = {}) => {
  const {
    soundObj,
    playbackObj,
    currentAudio,
    updateState,
    audioFiles,
    onPlaybackStatusUpdate,
  } = context;
  try {
    if (!soundObj) {
      // If soundObj is not defined, load and play the audio
      const status = await play(playbackObj, audio.uri, audio.lastPosition);
      const index = audioFiles.findIndex(({ id }) => id === audio.id);
      updateState(context, {
        currentAudio: audio,
        soundObj: status,
        isPlaying: true,
        currentAudioIndex: index,
        isPlayListRunning: false,
        activePlayList: [],
        ...playListInfo,
      });
      playbackObj.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      return storeAudioForNextOpening(audio, index);
    }

    if (soundObj.isLoaded && soundObj.isPlaying && currentAudio.id === audio.id) {
      // Pause the audio if it's currently playing
      const status = await pause(playbackObj);
      return updateState(context, {
        soundObj: status,
        isPlaying: false,
        playbackPosition: status.positionMillis,
      });
    }

    if (soundObj.isLoaded && !soundObj.isPlaying && currentAudio.id === audio.id) {
      // Resume the audio if it's loaded but not playing
      const status = await resume(playbackObj);
      return updateState(context, { soundObj: status, isPlaying: true });
    }

    if (soundObj.isLoaded && currentAudio.id !== audio.id) {
      // Play a different audio if a new audio is selected
      const status = await playNext(playbackObj, audio.uri);
      const index = audioFiles.findIndex(({ id }) => id === audio.id);
      updateState(context, {
        currentAudio: audio,
        soundObj: status,
        isPlaying: true,
        currentAudioIndex: index,
        isPlayListRunning: false,
        activePlayList: [],
        ...playListInfo,
      });
      return storeAudioForNextOpening(audio, index);
    }
  } catch (error) {
    console.log('Error inside select audio method:', error.message);
  }
};

const selectAudioFromPlayList = async (context, select) => {
  const { activePlayList, currentAudio, audioFiles, playbackObj, updateState } =
    context;
  let audio;
  let defaultIndex;
  let nextIndex;

  const indexOnPlayList = activePlayList.audios.findIndex(
    ({ id }) => id === currentAudio.id
  );

  if (select === 'next') {
    nextIndex = indexOnPlayList + 1;
    defaultIndex = 0;
  }

  if (select === 'previous') {
    nextIndex = indexOnPlayList - 1;
    defaultIndex = activePlayList.audios.length - 1;
  }
  audio = activePlayList.audios[nextIndex];

  if (!audio) audio = activePlayList.audios[defaultIndex];

  const indexOnAllList = audioFiles.findIndex(({ id }) => id === audio.id);

  const status = await playNext(playbackObj, audio.uri);
  return updateState(context, {
    soundObj: status,
    isPlaying: true,
    currentAudio: audio,
    currentAudioIndex: indexOnAllList,
  });
};

export const changeAudio = async (context, select) => {
  const {
    playbackObj,
    currentAudioIndex,
    totalAudioCount,
    audioFiles,
    updateState,
    isPlayListRunning,
  } = context;

  if (isPlayListRunning) return selectAudioFromPlayList(context, select);

  try {
    const { isLoaded } = await playbackObj.getStatusAsync();
    const isLastAudio = currentAudioIndex + 1 === totalAudioCount;
    const isFirstAudio = currentAudioIndex <= 0;
    let audio;
    let index;
    let status;

    if (select === 'next') {
      audio = audioFiles[currentAudioIndex + 1];
      if (!isLoaded && !isLastAudio) {
        index = currentAudioIndex + 1;
        status = await play(playbackObj, audio.uri);
        playbackObj.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      }

      if (isLoaded && !isLastAudio) {
        index = currentAudioIndex + 1;
        status = await playNext(playbackObj, audio.uri);
      }

      if (isLastAudio) {
        index = 0;
        audio = audioFiles[index];
        if (isLoaded) {
          status = await playNext(playbackObj, audio.uri);
        } else {
          status = await play(playbackObj, audio.uri);
        }
      }
    }

    if (select === 'previous') {
      audio = audioFiles[currentAudioIndex - 1];
      if (!isLoaded && !isFirstAudio) {
        index = currentAudioIndex - 1;
        status = await play(playbackObj, audio.uri);
        playbackObj.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      }

      if (isLoaded && !isFirstAudio) {
        index = currentAudioIndex - 1;
        status = await playNext(playbackObj, audio.uri);
      }

      if (isFirstAudio) {
        index = totalAudioCount - 1;
        audio = audioFiles[index];
        if (isLoaded) {
          status = await playNext(playbackObj, audio.uri);
        } else {
          status = await play(playbackObj, audio.uri);
        }
      }
    }

    updateState(context, {
      currentAudio: audio,
      soundObj: status,
      isPlaying: true,
      currentAudioIndex: index,
      playbackPosition: null,
      playbackDuration: null,
    });
    storeAudioForNextOpening(audio, index);
  } catch (error) {
    console.log('Error inside change audio method:', error.message);
  }
};

export const moveAudio = async (context, value) => {
  const { soundObj, isPlaying, playbackObj, updateState } = context;
  if (soundObj === null || !isPlaying) return;

  try {
    const status = await playbackObj.setPositionAsync(
      Math.floor(soundObj.durationMillis * value)
    );
    updateState(context, {
      soundObj: status,
      playbackPosition: status.positionMillis,
    });

    await resume(playbackObj);
  } catch (error) {
    console.log('Error inside move audio method:', error.message);
  }
};
