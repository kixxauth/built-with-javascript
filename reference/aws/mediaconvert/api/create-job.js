{
    "clientRequestToken": "string",
    "jobTemplate": "string",
    "queue": "string",
    "role": "string",
    "settings": {
        "timecodeConfig": {
            "anchor": "string",
            "source": enum,
            "start": "string",
            "timestampOffset": "string"
        },
        "outputGroups": [
            {
                "customName": "string",
                "name": "string",
                "outputs": [
                    {
                        "containerSettings": {
                            "container": enum,
                            "m3u8Settings": {
                                "audioFramesPerPes": integer,
                                "pcrControl": enum,
                                "dataPTSControl": enum,
                                "maxPcrInterval": integer,
                                "pcrPid": integer,
                                "pmtPid": integer,
                                "privateMetadataPid": integer,
                                "programNumber": integer,
                                "patInterval": integer,
                                "pmtInterval": integer,
                                "scte35Source": enum,
                                "scte35Pid": integer,
                                "nielsenId3": enum,
                                "timedMetadata": enum,
                                "timedMetadataPid": integer,
                                "transportStreamId": integer,
                                "videoPid": integer,
                                "ptsOffsetMode": enum,
                                "ptsOffset": integer,
                                "audioPids": [
                                    integer
                                ],
                                "audioDuration": enum
                            },
                            "f4vSettings": {
                                "moovPlacement": enum
                            },
                            "m2tsSettings": {
                                "audioBufferModel": enum,
                                "minEbpInterval": integer,
                                "esRateInPes": enum,
                                "patInterval": integer,
                                "dvbNitSettings": {
                                    "nitInterval": integer,
                                    "networkId": integer,
                                    "networkName": "string"
                                },
                                "dvbSdtSettings": {
                                    "outputSdt": enum,
                                    "sdtInterval": integer,
                                    "serviceName": "string",
                                    "serviceProviderName": "string"
                                },
                                "scte35Source": enum,
                                "scte35Pid": integer,
                                "scte35Esam": {
                                    "scte35EsamPid": integer
                                },
                                "klvMetadata": enum,
                                "videoPid": integer,
                                "dvbTdtSettings": {
                                    "tdtInterval": integer
                                },
                                "pmtInterval": integer,
                                "segmentationStyle": enum,
                                "segmentationTime": number,
                                "pmtPid": integer,
                                "bitrate": integer,
                                "audioPids": [
                                    integer
                                ],
                                "privateMetadataPid": integer,
                                "nielsenId3": enum,
                                "timedMetadataPid": integer,
                                "maxPcrInterval": integer,
                                "transportStreamId": integer,
                                "dvbSubPids": [
                                    integer
                                ],
                                "rateMode": enum,
                                "audioFramesPerPes": integer,
                                "pcrControl": enum,
                                "dataPTSControl": enum,
                                "segmentationMarkers": enum,
                                "ebpAudioInterval": enum,
                                "forceTsVideoEbpOrder": enum,
                                "programNumber": integer,
                                "pcrPid": integer,
                                "bufferModel": enum,
                                "dvbTeletextPid": integer,
                                "fragmentTime": number,
                                "ebpPlacement": enum,
                                "nullPacketBitrate": number,
                                "audioDuration": enum,
                                "ptsOffsetMode": enum,
                                "ptsOffset": integer
                            },
                            "movSettings": {
                                "clapAtom": enum,
                                "cslgAtom": enum,
                                "paddingControl": enum,
                                "reference": enum,
                                "mpeg2FourCCControl": enum
                            },
                            "mp4Settings": {
                                "cslgAtom": enum,
                                "cttsVersion": integer,
                                "freeSpaceBox": enum,
                                "mp4MajorBrand": "string",
                                "moovPlacement": enum,
                                "audioDuration": enum
                            },
                            "mpdSettings": {
                                "accessibilityCaptionHints": enum,
                                "captionContainerType": enum,
                                "scte35Source": enum,
                                "scte35Esam": enum,
                                "audioDuration": enum,
                                "timedMetadata": enum,
                                "timedMetadataBoxVersion": enum,
                                "timedMetadataSchemeIdUri": "string",
                                "timedMetadataValue": "string",
                                "manifestMetadataSignaling": enum,
                                "klvMetadata": enum
                            },
                            "cmfcSettings": {
                                "scte35Source": enum,
                                "scte35Esam": enum,
                                "audioDuration": enum,
                                "iFrameOnlyManifest": enum,
                                "audioGroupId": "string",
                                "audioRenditionSets": "string",
                                "audioTrackType": enum,
                                "descriptiveVideoServiceFlag": enum,
                                "timedMetadata": enum,
                                "timedMetadataBoxVersion": enum,
                                "timedMetadataSchemeIdUri": "string",
                                "timedMetadataValue": "string",
                                "manifestMetadataSignaling": enum,
                                "klvMetadata": enum
                            },
                            "mxfSettings": {
                                "afdSignaling": enum,
                                "profile": enum,
                                "xavcProfileSettings": {
                                    "durationMode": enum,
                                    "maxAncDataSize": integer
                                }
                            }
                        },
                        "preset": "string",
                        "videoDescription": {
                            "fixedAfd": integer,
                            "width": integer,
                            "scalingBehavior": enum,
                            "crop": {
                                "height": integer,
                                "width": integer,
                                "x": integer,
                                "y": integer
                            },
                            "height": integer,
                            "videoPreprocessors": {
                                "colorCorrector": {
                                    "brightness": integer,
                                    "colorSpaceConversion": enum,
                                    "sampleRangeConversion": enum,
                                    "clipLimits": {
                                        "minimumYUV": integer,
                                        "maximumYUV": integer,
                                        "minimumRGBTolerance": integer,
                                        "maximumRGBTolerance": integer
                                    },
                                    "sdrReferenceWhiteLevel": integer,
                                    "contrast": integer,
                                    "hue": integer,
                                    "saturation": integer,
                                    "hdr10Metadata": {
                                        "redPrimaryX": integer,
                                        "redPrimaryY": integer,
                                        "greenPrimaryX": integer,
                                        "greenPrimaryY": integer,
                                        "bluePrimaryX": integer,
                                        "bluePrimaryY": integer,
                                        "whitePointX": integer,
                                        "whitePointY": integer,
                                        "maxFrameAverageLightLevel": integer,
                                        "maxContentLightLevel": integer,
                                        "maxLuminance": integer,
                                        "minLuminance": integer
                                    },
                                    "hdrToSdrToneMapper": enum
                                },
                                "deinterlacer": {
                                    "algorithm": enum,
                                    "mode": enum,
                                    "control": enum
                                },
                                "dolbyVision": {
                                    "profile": enum,
                                    "l6Mode": enum,
                                    "l6Metadata": {
                                        "maxCll": integer,
                                        "maxFall": integer
                                    },
                                    "mapping": enum
                                },
                                "hdr10Plus": {
                                    "masteringMonitorNits": integer,
                                    "targetMonitorNits": integer
                                },
                                "imageInserter": {
                                    "insertableImages": [
                                        {
                                            "width": integer,
                                            "height": integer,
                                            "imageX": integer,
                                            "imageY": integer,
                                            "duration": integer,
                                            "fadeIn": integer,
                                            "layer": integer,
                                            "imageInserterInput": "string",
                                            "startTime": "string",
                                            "fadeOut": integer,
                                            "opacity": integer
                                        }
                                    ],
                                    "sdrReferenceWhiteLevel": integer
                                },
                                "noiseReducer": {
                                    "filter": enum,
                                    "filterSettings": {
                                        "strength": integer
                                    },
                                    "spatialFilterSettings": {
                                        "strength": integer,
                                        "speed": integer,
                                        "postFilterSharpenStrength": integer
                                    },
                                    "temporalFilterSettings": {
                                        "strength": integer,
                                        "speed": integer,
                                        "aggressiveMode": integer,
                                        "postTemporalSharpening": enum,
                                        "postTemporalSharpeningStrength": enum
                                    }
                                },
                                "timecodeBurnin": {
                                    "fontSize": integer,
                                    "position": enum,
                                    "prefix": "string"
                                },
                                "partnerWatermarking": {
                                    "nexguardFileMarkerSettings": {
                                        "license": "string",
                                        "preset": "string",
                                        "payload": integer,
                                        "strength": enum
                                    }
                                }
                            },
                            "timecodeInsertion": enum,
                            "antiAlias": enum,
                            "position": {
                                "height": integer,
                                "width": integer,
                                "x": integer,
                                "y": integer
                            },
                            "sharpness": integer,
                            "codecSettings": {
                                "codec": enum,
                                "av1Settings": {
                                    "gopSize": number,
                                    "numberBFramesBetweenReferenceFrames": integer,
                                    "slices": integer,
                                    "bitDepth": enum,
                                    "rateControlMode": enum,
                                    "qvbrSettings": {
                                        "qvbrQualityLevel": integer,
                                        "qvbrQualityLevelFineTune": number
                                    },
                                    "maxBitrate": integer,
                                    "adaptiveQuantization": enum,
                                    "spatialAdaptiveQuantization": enum,
                                    "framerateControl": enum,
                                    "framerateConversionAlgorithm": enum,
                                    "framerateNumerator": integer,
                                    "framerateDenominator": integer,
                                    "filmGrainSynthesis": enum
                                },
                                "avcIntraSettings": {
                                    "avcIntraClass": enum,
                                    "avcIntraUhdSettings": {
                                        "qualityTuningLevel": enum
                                    },
                                    "interlaceMode": enum,
                                    "scanTypeConversionMode": enum,
                                    "framerateDenominator": integer,
                                    "slowPal": enum,
                                    "framerateControl": enum,
                                    "telecine": enum,
                                    "framerateNumerator": integer,
                                    "framerateConversionAlgorithm": enum
                                },
                                "frameCaptureSettings": {
                                    "framerateNumerator": integer,
                                    "framerateDenominator": integer,
                                    "maxCaptures": integer,
                                    "quality": integer
                                },
                                "h264Settings": {
                                    "interlaceMode": enum,
                                    "scanTypeConversionMode": enum,
                                    "parNumerator": integer,
                                    "numberReferenceFrames": integer,
                                    "syntax": enum,
                                    "softness": integer,
                                    "framerateDenominator": integer,
                                    "gopClosedCadence": integer,
                                    "hrdBufferInitialFillPercentage": integer,
                                    "gopSize": number,
                                    "slices": integer,
                                    "gopBReference": enum,
                                    "hrdBufferSize": integer,
                                    "maxBitrate": integer,
                                    "slowPal": enum,
                                    "parDenominator": integer,
                                    "spatialAdaptiveQuantization": enum,
                                    "temporalAdaptiveQuantization": enum,
                                    "flickerAdaptiveQuantization": enum,
                                    "entropyEncoding": enum,
                                    "bitrate": integer,
                                    "framerateControl": enum,
                                    "rateControlMode": enum,
                                    "qvbrSettings": {
                                        "qvbrQualityLevel": integer,
                                        "qvbrQualityLevelFineTune": number,
                                        "maxAverageBitrate": integer
                                    },
                                    "codecProfile": enum,
                                    "telecine": enum,
                                    "framerateNumerator": integer,
                                    "minIInterval": integer,
                                    "adaptiveQuantization": enum,
                                    "codecLevel": enum,
                                    "fieldEncoding": enum,
                                    "sceneChangeDetect": enum,
                                    "qualityTuningLevel": enum,
                                    "framerateConversionAlgorithm": enum,
                                    "unregisteredSeiTimecode": enum,
                                    "gopSizeUnits": enum,
                                    "parControl": enum,
                                    "numberBFramesBetweenReferenceFrames": integer,
                                    "repeatPps": enum,
                                    "dynamicSubGop": enum,
                                    "hrdBufferFinalFillPercentage": integer,
                                    "bandwidthReductionFilter": {
                                        "strength": enum,
                                        "sharpening": enum
                                    }
                                },
                                "h265Settings": {
                                    "interlaceMode": enum,
                                    "scanTypeConversionMode": enum,
                                    "parNumerator": integer,
                                    "numberReferenceFrames": integer,
                                    "framerateDenominator": integer,
                                    "gopClosedCadence": integer,
                                    "alternateTransferFunctionSei": enum,
                                    "hrdBufferInitialFillPercentage": integer,
                                    "gopSize": number,
                                    "slices": integer,
                                    "gopBReference": enum,
                                    "hrdBufferSize": integer,
                                    "maxBitrate": integer,
                                    "slowPal": enum,
                                    "parDenominator": integer,
                                    "spatialAdaptiveQuantization": enum,
                                    "temporalAdaptiveQuantization": enum,
                                    "flickerAdaptiveQuantization": enum,
                                    "bitrate": integer,
                                    "framerateControl": enum,
                                    "rateControlMode": enum,
                                    "qvbrSettings": {
                                        "qvbrQualityLevel": integer,
                                        "qvbrQualityLevelFineTune": number,
                                        "maxAverageBitrate": integer
                                    },
                                    "codecProfile": enum,
                                    "tiles": enum,
                                    "telecine": enum,
                                    "framerateNumerator": integer,
                                    "minIInterval": integer,
                                    "adaptiveQuantization": enum,
                                    "codecLevel": enum,
                                    "sceneChangeDetect": enum,
                                    "qualityTuningLevel": enum,
                                    "framerateConversionAlgorithm": enum,
                                    "unregisteredSeiTimecode": enum,
                                    "gopSizeUnits": enum,
                                    "parControl": enum,
                                    "numberBFramesBetweenReferenceFrames": integer,
                                    "temporalIds": enum,
                                    "sampleAdaptiveOffsetFilterMode": enum,
                                    "writeMp4PackagingType": enum,
                                    "dynamicSubGop": enum,
                                    "hrdBufferFinalFillPercentage": integer,
                                    "bandwidthReductionFilter": {
                                        "strength": enum,
                                        "sharpening": enum
                                    }
                                },
                                "mpeg2Settings": {
                                    "interlaceMode": enum,
                                    "scanTypeConversionMode": enum,
                                    "parNumerator": integer,
                                    "syntax": enum,
                                    "softness": integer,
                                    "framerateDenominator": integer,
                                    "gopClosedCadence": integer,
                                    "hrdBufferInitialFillPercentage": integer,
                                    "gopSize": number,
                                    "hrdBufferSize": integer,
                                    "maxBitrate": integer,
                                    "slowPal": enum,
                                    "parDenominator": integer,
                                    "spatialAdaptiveQuantization": enum,
                                    "temporalAdaptiveQuantization": enum,
                                    "bitrate": integer,
                                    "intraDcPrecision": enum,
                                    "framerateControl": enum,
                                    "rateControlMode": enum,
                                    "codecProfile": enum,
                                    "telecine": enum,
                                    "framerateNumerator": integer,
                                    "minIInterval": integer,
                                    "adaptiveQuantization": enum,
                                    "codecLevel": enum,
                                    "sceneChangeDetect": enum,
                                    "qualityTuningLevel": enum,
                                    "framerateConversionAlgorithm": enum,
                                    "gopSizeUnits": enum,
                                    "parControl": enum,
                                    "numberBFramesBetweenReferenceFrames": integer,
                                    "dynamicSubGop": enum,
                                    "hrdBufferFinalFillPercentage": integer
                                },
                                "proresSettings": {
                                    "interlaceMode": enum,
                                    "scanTypeConversionMode": enum,
                                    "parNumerator": integer,
                                    "framerateDenominator": integer,
                                    "codecProfile": enum,
                                    "slowPal": enum,
                                    "parDenominator": integer,
                                    "framerateControl": enum,
                                    "telecine": enum,
                                    "chromaSampling": enum,
                                    "framerateNumerator": integer,
                                    "framerateConversionAlgorithm": enum,
                                    "parControl": enum
                                },
                                "vc3Settings": {
                                    "vc3Class": enum,
                                    "interlaceMode": enum,
                                    "scanTypeConversionMode": enum,
                                    "framerateConversionAlgorithm": enum,
                                    "telecine": enum,
                                    "slowPal": enum,
                                    "framerateControl": enum,
                                    "framerateDenominator": integer,
                                    "framerateNumerator": integer
                                },
                                "vp8Settings": {
                                    "qualityTuningLevel": enum,
                                    "rateControlMode": enum,
                                    "gopSize": number,
                                    "maxBitrate": integer,
                                    "bitrate": integer,
                                    "hrdBufferSize": integer,
                                    "framerateControl": enum,
                                    "framerateConversionAlgorithm": enum,
                                    "framerateNumerator": integer,
                                    "framerateDenominator": integer,
                                    "parControl": enum,
                                    "parNumerator": integer,
                                    "parDenominator": integer
                                },
                                "vp9Settings": {
                                    "qualityTuningLevel": enum,
                                    "rateControlMode": enum,
                                    "gopSize": number,
                                    "maxBitrate": integer,
                                    "bitrate": integer,
                                    "hrdBufferSize": integer,
                                    "framerateControl": enum,
                                    "framerateConversionAlgorithm": enum,
                                    "framerateNumerator": integer,
                                    "framerateDenominator": integer,
                                    "parControl": enum,
                                    "parNumerator": integer,
                                    "parDenominator": integer
                                },
                                "xavcSettings": {
                                    "profile": enum,
                                    "xavcHdIntraCbgProfileSettings": {
                                        "xavcClass": enum
                                    },
                                    "xavc4kIntraCbgProfileSettings": {
                                        "xavcClass": enum
                                    },
                                    "xavc4kIntraVbrProfileSettings": {
                                        "xavcClass": enum
                                    },
                                    "xavcHdProfileSettings": {
                                        "bitrateClass": enum,
                                        "slices": integer,
                                        "hrdBufferSize": integer,
                                        "qualityTuningLevel": enum,
                                        "interlaceMode": enum,
                                        "telecine": enum,
                                        "gopClosedCadence": integer,
                                        "gopBReference": enum,
                                        "flickerAdaptiveQuantization": enum
                                    },
                                    "xavc4kProfileSettings": {
                                        "bitrateClass": enum,
                                        "slices": integer,
                                        "hrdBufferSize": integer,
                                        "codecProfile": enum,
                                        "qualityTuningLevel": enum,
                                        "gopClosedCadence": integer,
                                        "gopBReference": enum,
                                        "flickerAdaptiveQuantization": enum
                                    },
                                    "softness": integer,
                                    "framerateDenominator": integer,
                                    "slowPal": enum,
                                    "spatialAdaptiveQuantization": enum,
                                    "temporalAdaptiveQuantization": enum,
                                    "entropyEncoding": enum,
                                    "framerateControl": enum,
                                    "framerateNumerator": integer,
                                    "adaptiveQuantization": enum,
                                    "framerateConversionAlgorithm": enum
                                }
                            },
                            "afdSignaling": enum,
                            "dropFrameTimecode": enum,
                            "respondToAfd": enum,
                            "colorMetadata": enum
                        },
                        "audioDescriptions": [
                            {
                                "audioTypeControl": enum,
                                "audioSourceName": "string",
                                "audioNormalizationSettings": {
                                    "algorithm": enum,
                                    "algorithmControl": enum,
                                    "correctionGateLevel": integer,
                                    "loudnessLogging": enum,
                                    "targetLkfs": number,
                                    "peakCalculation": enum,
                                    "truePeakLimiterThreshold": number
                                },
                                "audioChannelTaggingSettings": {
                                    "channelTag": enum
                                },
                                "codecSettings": {
                                    "codec": enum,
                                    "aacSettings": {
                                        "audioDescriptionBroadcasterMix": enum,
                                        "vbrQuality": enum,
                                        "bitrate": integer,
                                        "rateControlMode": enum,
                                        "codecProfile": enum,
                                        "codingMode": enum,
                                        "rawFormat": enum,
                                        "sampleRate": integer,
                                        "specification": enum
                                    },
                                    "ac3Settings": {
                                        "bitrate": integer,
                                        "bitstreamMode": enum,
                                        "codingMode": enum,
                                        "dialnorm": integer,
                                        "dynamicRangeCompressionProfile": enum,
                                        "dynamicRangeCompressionLine": enum,
                                        "dynamicRangeCompressionRf": enum,
                                        "metadataControl": enum,
                                        "lfeFilter": enum,
                                        "sampleRate": integer
                                    },
                                    "aiffSettings": {
                                        "bitDepth": integer,
                                        "channels": integer,
                                        "sampleRate": integer
                                    },
                                    "eac3Settings": {
                                        "metadataControl": enum,
                                        "surroundExMode": enum,
                                        "loRoSurroundMixLevel": number,
                                        "phaseControl": enum,
                                        "dialnorm": integer,
                                        "ltRtSurroundMixLevel": number,
                                        "bitrate": integer,
                                        "ltRtCenterMixLevel": number,
                                        "passthroughControl": enum,
                                        "lfeControl": enum,
                                        "loRoCenterMixLevel": number,
                                        "attenuationControl": enum,
                                        "codingMode": enum,
                                        "surroundMode": enum,
                                        "bitstreamMode": enum,
                                        "lfeFilter": enum,
                                        "stereoDownmix": enum,
                                        "dynamicRangeCompressionRf": enum,
                                        "sampleRate": integer,
                                        "dynamicRangeCompressionLine": enum,
                                        "dcFilter": enum
                                    },
                                    "eac3AtmosSettings": {
                                        "surroundExMode": enum,
                                        "loRoSurroundMixLevel": number,
                                        "ltRtSurroundMixLevel": number,
                                        "bitrate": integer,
                                        "ltRtCenterMixLevel": number,
                                        "loRoCenterMixLevel": number,
                                        "codingMode": enum,
                                        "bitstreamMode": enum,
                                        "stereoDownmix": enum,
                                        "dynamicRangeCompressionRf": enum,
                                        "sampleRate": integer,
                                        "dynamicRangeCompressionLine": enum,
                                        "downmixControl": enum,
                                        "dynamicRangeControl": enum,
                                        "meteringMode": enum,
                                        "dialogueIntelligence": enum,
                                        "speechThreshold": integer
                                    },
                                    "flacSettings": {
                                        "bitDepth": integer,
                                        "channels": integer,
                                        "sampleRate": integer
                                    },
                                    "mp2Settings": {
                                        "bitrate": integer,
                                        "channels": integer,
                                        "sampleRate": integer
                                    },
                                    "mp3Settings": {
                                        "bitrate": integer,
                                        "channels": integer,
                                        "rateControlMode": enum,
                                        "sampleRate": integer,
                                        "vbrQuality": integer
                                    },
                                    "opusSettings": {
                                        "bitrate": integer,
                                        "channels": integer,
                                        "sampleRate": integer
                                    },
                                    "vorbisSettings": {
                                        "channels": integer,
                                        "sampleRate": integer,
                                        "vbrQuality": integer
                                    },
                                    "wavSettings": {
                                        "bitDepth": integer,
                                        "channels": integer,
                                        "sampleRate": integer,
                                        "format": enum
                                    }
                                },
                                "remixSettings": {
                                    "channelMapping": {
                                        "outputChannels": [
                                            {
                                                "inputChannels": [
                                                    integer
                                                ],
                                                "inputChannelsFineTune": [
                                                    number
                                                ]
                                            }
                                        ]
                                    },
                                    "channelsIn": integer,
                                    "channelsOut": integer
                                },
                                "streamName": "string",
                                "languageCodeControl": enum,
                                "audioType": integer,
                                "customLanguageCode": "string",
                                "languageCode": enum
                            }
                        ],
                        "outputSettings": {
                            "hlsSettings": {
                                "audioGroupId": "string",
                                "audioRenditionSets": "string",
                                "audioTrackType": enum,
                                "descriptiveVideoServiceFlag": enum,
                                "iFrameOnlyManifest": enum,
                                "segmentModifier": "string",
                                "audioOnlyContainer": enum
                            }
                        },
                        "extension": "string",
                        "nameModifier": "string",
                        "captionDescriptions": [
                            {
                                "captionSelectorName": "string",
                                "destinationSettings": {
                                    "destinationType": enum,
                                    "burninDestinationSettings": {
                                        "backgroundOpacity": integer,
                                        "shadowXOffset": integer,
                                        "teletextSpacing": enum,
                                        "alignment": enum,
                                        "outlineSize": integer,
                                        "yPosition": integer,
                                        "shadowColor": enum,
                                        "fontOpacity": integer,
                                        "fontSize": integer,
                                        "fontScript": enum,
                                        "fallbackFont": enum,
                                        "fontColor": enum,
                                        "hexFontColor": "string",
                                        "applyFontColor": enum,
                                        "backgroundColor": enum,
                                        "fontResolution": integer,
                                        "outlineColor": enum,
                                        "shadowYOffset": integer,
                                        "xPosition": integer,
                                        "shadowOpacity": integer,
                                        "stylePassthrough": enum
                                    },
                                    "dvbSubDestinationSettings": {
                                        "backgroundOpacity": integer,
                                        "shadowXOffset": integer,
                                        "teletextSpacing": enum,
                                        "alignment": enum,
                                        "outlineSize": integer,
                                        "yPosition": integer,
                                        "shadowColor": enum,
                                        "fontOpacity": integer,
                                        "fontSize": integer,
                                        "fontScript": enum,
                                        "fallbackFont": enum,
                                        "fontColor": enum,
                                        "hexFontColor": "string",
                                        "applyFontColor": enum,
                                        "backgroundColor": enum,
                                        "fontResolution": integer,
                                        "outlineColor": enum,
                                        "shadowYOffset": integer,
                                        "xPosition": integer,
                                        "shadowOpacity": integer,
                                        "subtitlingType": enum,
                                        "ddsHandling": enum,
                                        "ddsXCoordinate": integer,
                                        "ddsYCoordinate": integer,
                                        "width": integer,
                                        "height": integer,
                                        "stylePassthrough": enum
                                    },
                                    "sccDestinationSettings": {
                                        "framerate": enum
                                    },
                                    "teletextDestinationSettings": {
                                        "pageNumber": "string",
                                        "pageTypes": [
                                            enum
                                        ]
                                    },
                                    "ttmlDestinationSettings": {
                                        "stylePassthrough": enum
                                    },
                                    "imscDestinationSettings": {
                                        "stylePassthrough": enum,
                                        "accessibility": enum
                                    },
                                    "embeddedDestinationSettings": {
                                        "destination608ChannelNumber": integer,
                                        "destination708ServiceNumber": integer
                                    },
                                    "webvttDestinationSettings": {
                                        "stylePassthrough": enum,
                                        "accessibility": enum
                                    },
                                    "srtDestinationSettings": {
                                        "stylePassthrough": enum
                                    }
                                },
                                "customLanguageCode": "string",
                                "languageCode": enum,
                                "languageDescription": "string"
                            }
                        ]
                    }
                ],
                "outputGroupSettings": {
                    "type": enum,
                    "hlsGroupSettings": {
                        "targetDurationCompatibilityMode": enum,
                        "manifestDurationFormat": enum,
                        "segmentLength": integer,
                        "segmentLengthControl": enum,
                        "timedMetadataId3Period": integer,
                        "captionLanguageSetting": enum,
                        "captionLanguageMappings": [
                            {
                                "captionChannel": integer,
                                "customLanguageCode": "string",
                                "languageCode": enum,
                                "languageDescription": "string"
                            }
                        ],
                        "destination": "string",
                        "destinationSettings": {
                            "s3Settings": {
                                "encryption": {
                                    "encryptionType": enum,
                                    "kmsKeyArn": "string",
                                    "kmsEncryptionContext": "string"
                                },
                                "accessControl": {
                                    "cannedAcl": enum
                                },
                                "storageClass": enum
                            }
                        },
                        "additionalManifests": [
                            {
                                "manifestNameModifier": "string",
                                "selectedOutputs": [
                                    "string"
                                ]
                            }
                        ],
                        "encryption": {
                            "encryptionMethod": enum,
                            "constantInitializationVector": "string",
                            "initializationVectorInManifest": enum,
                            "offlineEncrypted": enum,
                            "spekeKeyProvider": {
                                "resourceId": "string",
                                "systemIds": [
                                    "string"
                                ],
                                "url": "string",
                                "certificateArn": "string"
                            },
                            "staticKeyProvider": {
                                "staticKeyValue": "string",
                                "keyFormat": "string",
                                "keyFormatVersions": "string",
                                "url": "string"
                            },
                            "type": enum
                        },
                        "timedMetadataId3Frame": enum,
                        "baseUrl": "string",
                        "codecSpecification": enum,
                        "outputSelection": enum,
                        "programDateTimePeriod": integer,
                        "segmentsPerSubdirectory": integer,
                        "minSegmentLength": integer,
                        "minFinalSegmentLength": number,
                        "directoryStructure": enum,
                        "programDateTime": enum,
                        "adMarkers": [
                            enum
                        ],
                        "segmentControl": enum,
                        "timestampDeltaMilliseconds": integer,
                        "manifestCompression": enum,
                        "clientCache": enum,
                        "audioOnlyHeader": enum,
                        "streamInfResolution": enum,
                        "imageBasedTrickPlay": enum,
                        "progressiveWriteHlsManifest": enum,
                        "imageBasedTrickPlaySettings": {
                            "thumbnailHeight": integer,
                            "thumbnailWidth": integer,
                            "tileHeight": integer,
                            "tileWidth": integer,
                            "intervalCadence": enum,
                            "thumbnailInterval": number
                        },
                        "captionSegmentLengthControl": enum
                    },
                    "dashIsoGroupSettings": {
                        "audioChannelConfigSchemeIdUri": enum,
                        "segmentLength": integer,
                        "minFinalSegmentLength": number,
                        "segmentLengthControl": enum,
                        "destination": "string",
                        "destinationSettings": {
                            "s3Settings": {
                                "encryption": {
                                    "encryptionType": enum,
                                    "kmsKeyArn": "string",
                                    "kmsEncryptionContext": "string"
                                },
                                "accessControl": {
                                    "cannedAcl": enum
                                },
                                "storageClass": enum
                            }
                        },
                        "additionalManifests": [
                            {
                                "manifestNameModifier": "string",
                                "selectedOutputs": [
                                    "string"
                                ]
                            }
                        ],
                        "encryption": {
                            "playbackDeviceCompatibility": enum,
                            "spekeKeyProvider": {
                                "resourceId": "string",
                                "systemIds": [
                                    "string"
                                ],
                                "url": "string",
                                "certificateArn": "string"
                            }
                        },
                        "minBufferTime": integer,
                        "fragmentLength": integer,
                        "baseUrl": "string",
                        "segmentControl": enum,
                        "ptsOffsetHandlingForBFrames": enum,
                        "mpdManifestBandwidthType": enum,
                        "mpdProfile": enum,
                        "hbbtvCompliance": enum,
                        "writeSegmentTimelineInRepresentation": enum,
                        "imageBasedTrickPlay": enum,
                        "imageBasedTrickPlaySettings": {
                            "thumbnailHeight": integer,
                            "thumbnailWidth": integer,
                            "tileHeight": integer,
                            "tileWidth": integer,
                            "intervalCadence": enum,
                            "thumbnailInterval": number
                        },
                        "videoCompositionOffsets": enum,
                        "dashManifestStyle": enum
                    },
                    "fileGroupSettings": {
                        "destination": "string",
                        "destinationSettings": {
                            "s3Settings": {
                                "encryption": {
                                    "encryptionType": enum,
                                    "kmsKeyArn": "string",
                                    "kmsEncryptionContext": "string"
                                },
                                "accessControl": {
                                    "cannedAcl": enum
                                },
                                "storageClass": enum
                            }
                        }
                    },
                    "msSmoothGroupSettings": {
                        "destination": "string",
                        "destinationSettings": {
                            "s3Settings": {
                                "encryption": {
                                    "encryptionType": enum,
                                    "kmsKeyArn": "string",
                                    "kmsEncryptionContext": "string"
                                },
                                "accessControl": {
                                    "cannedAcl": enum
                                },
                                "storageClass": enum
                            }
                        },
                        "additionalManifests": [
                            {
                                "manifestNameModifier": "string",
                                "selectedOutputs": [
                                    "string"
                                ]
                            }
                        ],
                        "fragmentLength": integer,
                        "fragmentLengthControl": enum,
                        "encryption": {
                            "spekeKeyProvider": {
                                "resourceId": "string",
                                "systemIds": [
                                    "string"
                                ],
                                "url": "string",
                                "certificateArn": "string"
                            }
                        },
                        "manifestEncoding": enum,
                        "audioDeduplication": enum
                    },
                    "cmafGroupSettings": {
                        "targetDurationCompatibilityMode": enum,
                        "writeHlsManifest": enum,
                        "writeDashManifest": enum,
                        "segmentLength": integer,
                        "segmentLengthControl": enum,
                        "minFinalSegmentLength": number,
                        "destination": "string",
                        "destinationSettings": {
                            "s3Settings": {
                                "encryption": {
                                    "encryptionType": enum,
                                    "kmsKeyArn": "string",
                                    "kmsEncryptionContext": "string"
                                },
                                "accessControl": {
                                    "cannedAcl": enum
                                },
                                "storageClass": enum
                            }
                        },
                        "additionalManifests": [
                            {
                                "manifestNameModifier": "string",
                                "selectedOutputs": [
                                    "string"
                                ]
                            }
                        ],
                        "encryption": {
                            "encryptionMethod": enum,
                            "constantInitializationVector": "string",
                            "initializationVectorInManifest": enum,
                            "spekeKeyProvider": {
                                "resourceId": "string",
                                "hlsSignaledSystemIds": [
                                    "string"
                                ],
                                "dashSignaledSystemIds": [
                                    "string"
                                ],
                                "url": "string",
                                "certificateArn": "string"
                            },
                            "staticKeyProvider": {
                                "staticKeyValue": "string",
                                "keyFormat": "string",
                                "keyFormatVersions": "string",
                                "url": "string"
                            },
                            "type": enum
                        },
                        "minBufferTime": integer,
                        "fragmentLength": integer,
                        "baseUrl": "string",
                        "segmentControl": enum,
                        "ptsOffsetHandlingForBFrames": enum,
                        "mpdManifestBandwidthType": enum,
                        "mpdProfile": enum,
                        "writeSegmentTimelineInRepresentation": enum,
                        "manifestDurationFormat": enum,
                        "streamInfResolution": enum,
                        "clientCache": enum,
                        "manifestCompression": enum,
                        "codecSpecification": enum,
                        "imageBasedTrickPlay": enum,
                        "imageBasedTrickPlaySettings": {
                            "thumbnailHeight": integer,
                            "thumbnailWidth": integer,
                            "tileHeight": integer,
                            "tileWidth": integer,
                            "intervalCadence": enum,
                            "thumbnailInterval": number
                        },
                        "videoCompositionOffsets": enum,
                        "dashManifestStyle": enum
                    }
                },
                "automatedEncodingSettings": {
                    "abrSettings": {
                        "maxRenditions": integer,
                        "maxAbrBitrate": integer,
                        "minAbrBitrate": integer,
                        "rules": [
                            {
                                "type": enum,
                                "minTopRenditionSize": {
                                    "width": integer,
                                    "height": integer
                                },
                                "minBottomRenditionSize": {
                                    "width": integer,
                                    "height": integer
                                },
                                "forceIncludeRenditions": [
                                    {
                                        "width": integer,
                                        "height": integer
                                    }
                                ],
                                "allowedRenditions": [
                                    {
                                        "width": integer,
                                        "height": integer,
                                        "required": enum
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        ],
        "adAvailOffset": integer,
        "availBlanking": {
            "availBlankingImage": "string"
        },
        "timedMetadataInsertion": {
            "id3Insertions": [
                {
                    "timecode": "string",
                    "id3": "string"
                }
            ]
        },
        "nielsenConfiguration": {
            "breakoutCode": integer,
            "distributorId": "string"
        },
        "motionImageInserter": {
            "insertionMode": enum,
            "input": "string",
            "offset": {
                "imageX": integer,
                "imageY": integer
            },
            "startTime": "string",
            "playback": enum,
            "framerate": {
                "framerateNumerator": integer,
                "framerateDenominator": integer
            }
        },
        "esam": {
            "signalProcessingNotification": {
                "sccXml": "string"
            },
            "manifestConfirmConditionNotification": {
                "mccXml": "string"
            },
            "responseSignalPreroll": integer
        },
        "nielsenNonLinearWatermark": {
            "sourceId": integer,
            "cbetSourceId": "string",
            "activeWatermarkProcess": enum,
            "assetId": "string",
            "assetName": "string",
            "episodeId": "string",
            "ticServerUrl": "string",
            "metadataDestination": "string",
            "uniqueTicPerAudioTrack": enum,
            "adiFilename": "string",
            "sourceWatermarkStatus": enum
        },
        "kantarWatermark": {
            "credentialsSecretName": "string",
            "channelName": "string",
            "contentReference": "string",
            "kantarServerUrl": "string",
            "kantarLicenseId": integer,
            "logDestination": "string",
            "fileOffset": number,
            "metadata3": "string",
            "metadata4": "string",
            "metadata5": "string",
            "metadata6": "string",
            "metadata7": "string",
            "metadata8": "string"
        },
        "extendedDataServices": {
            "vchipAction": enum,
            "copyProtectionAction": enum
        },
        "inputs": [
            {
                "inputClippings": [
                    {
                        "endTimecode": "string",
                        "startTimecode": "string"
                    }
                ],
                "audioSelectors": {
                },
                "audioSelectorGroups": {
                },
                "programNumber": integer,
                "videoSelector": {
                    "colorSpace": enum,
                    "sampleRange": enum,
                    "rotate": enum,
                    "pid": integer,
                    "programNumber": integer,
                    "embeddedTimecodeOverride": enum,
                    "alphaBehavior": enum,
                    "colorSpaceUsage": enum,
                    "padVideo": enum,
                    "hdr10Metadata": {
                        "redPrimaryX": integer,
                        "redPrimaryY": integer,
                        "greenPrimaryX": integer,
                        "greenPrimaryY": integer,
                        "bluePrimaryX": integer,
                        "bluePrimaryY": integer,
                        "whitePointX": integer,
                        "whitePointY": integer,
                        "maxFrameAverageLightLevel": integer,
                        "maxContentLightLevel": integer,
                        "maxLuminance": integer,
                        "minLuminance": integer
                    }
                },
                "filterEnable": enum,
                "psiControl": enum,
                "filterStrength": integer,
                "deblockFilter": enum,
                "denoiseFilter": enum,
                "inputScanType": enum,
                "timecodeSource": enum,
                "timecodeStart": "string",
                "captionSelectors": {
                },
                "imageInserter": {
                    "insertableImages": [
                        {
                            "width": integer,
                            "height": integer,
                            "imageX": integer,
                            "imageY": integer,
                            "duration": integer,
                            "fadeIn": integer,
                            "layer": integer,
                            "imageInserterInput": "string",
                            "startTime": "string",
                            "fadeOut": integer,
                            "opacity": integer
                        }
                    ],
                    "sdrReferenceWhiteLevel": integer
                },
                "dolbyVisionMetadataXml": "string",
                "crop": {
                    "height": integer,
                    "width": integer,
                    "x": integer,
                    "y": integer
                },
                "position": {
                    "height": integer,
                    "width": integer,
                    "x": integer,
                    "y": integer
                },
                "advancedInputFilter": enum,
                "advancedInputFilterSettings": {
                    "sharpening": enum,
                    "addTexture": enum
                },
                "fileInput": "string",
                "videoGenerator": {
                    "duration": integer
                },
                "decryptionSettings": {
                    "decryptionMode": enum,
                    "encryptedDecryptionKey": "string",
                    "initializationVector": "string",
                    "kmsKeyRegion": "string"
                },
                "supplementalImps": [
                    "string"
                ]
            }
        ]
    },
    "userMetadata": {
    },
    "billingTagsSource": enum,
    "tags": {
    },
    "accelerationSettings": {
        "mode": enum
    },
    "statusUpdateInterval": enum,
    "priority": integer,
    "simulateReservedQueue": enum,
    "hopDestinations": [
        {
            "waitMinutes": integer,
            "queue": "string",
            "priority": integer
        }
    ]
}