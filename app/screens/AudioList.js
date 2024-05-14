import React, { Component } from 'react';
import { StyleSheet, Dimensions, Alert } from 'react-native';
import { AudioContext } from '../context/AudioProvider';
import { RecyclerListView, LayoutProvider } from 'recyclerlistview';
import AudioListItem from '../components/AudioListItem';
import Screen from '../components/Screen';
import OptionModal from '../components/OptionModal';
import { FileSystem } from 'expo'; // Import FileSystem from Expo
import { selectAudio } from '../misc/audioController';
import { storeAudioForNextOpening } from '../misc/helper';


export class AudioList extends Component {
  static contextType = AudioContext;

  constructor(props) {
    super(props);
    this.state = {
      optionModalVisible: false,
    };

    this.currentItem = {};
  }

  layoutProvider = new LayoutProvider(
    i => 'audio',
    (type, dim) => {
      switch (type) {
        case 'audio':
          dim.width = Dimensions.get('window').width;
          dim.height = 70;
          break;
        default:
          dim.width = 0;
          dim.height = 0;
      }
    }
  );

  handleAudioPress = async audio => {
    await selectAudio(audio, this.context);
  };

  navigateToPlaylist = () => {
    this.context.updateState(this.context, {
      addToPlayList: this.currentItem,
    });
    this.props.navigation.navigate('PlayList');
  };

  // Method to delete audio from the device using the URI
  deleteAudio = async audio => {
    alert(audio.uri)
    console.log(audio.uri)
    try {
      const audioFileName = audio.uri
      const fileUri = FileSystem.documentDirectory + audioFileName; // Define the file path
      await FileSystem.deleteAsync(fileUri); // Use FileSystem API from Expo to delete the audio file

      // Show an alert or confirmation after deleting
      Alert.alert(
        'Success',
        `Audio deleted successfully.`,
      );
    } catch (error) {
      Alert.alert('Error', `Failed to delete audio: ${error.message}`);
      console.log('Error deleting audio:', error.message);
    }
  };

  rowRenderer = (type, item, index, extendedState) => {
    return (
      <AudioListItem
        title={item.filename}
        isPlaying={extendedState.isPlaying}
        activeListItem={this.context.currentAudioIndex === index}
        duration={item.duration}
        onAudioPress={() => this.handleAudioPress(item)}
        onOptionPress={() => {
          this.currentItem = item;
          this.setState({ ...this.state, optionModalVisible: true });
        }}
        onDeletePress={() => this.deleteAudio(item)} // Add onDeletePress callback
      />
    );
  };

  componentDidMount() {
    this.context.loadPreviousAudio();
  }

  render() {
    return (
      <AudioContext.Consumer>
        {({ dataProvider, isPlaying }) => {
          if (!dataProvider._data.length) return null;
          return (
            <Screen>
              <RecyclerListView
                dataProvider={dataProvider}
                layoutProvider={this.layoutProvider}
                rowRenderer={this.rowRenderer}
                extendedState={{ isPlaying }}
              />
              <OptionModal
                options={[
                  {
                    title: 'Delete',
                    onPress: () => this.deleteAudio(this.currentItem),
                    // style: 'destructive', // Optional style for the delete option
                  },
                ]}
                currentItem={this.currentItem}
                onClose={() =>
                  this.setState({ ...this.state, optionModalVisible: false })
                }
                visible={this.state.optionModalVisible}
              />
            </Screen>
          );
        }}
      </AudioContext.Consumer>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AudioList;
