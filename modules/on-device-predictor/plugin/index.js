const { withXcodeProject, withInfoPlist } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withOnDevicePredictor(config) {
  // Add background modes to Info.plist
  config = withInfoPlist(config, (config) => {
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }
    
    const backgroundModes = config.modResults.UIBackgroundModes;
    
    if (!backgroundModes.includes('location')) {
      backgroundModes.push('location');
    }
    if (!backgroundModes.includes('fetch')) {
      backgroundModes.push('fetch');
    }
    
    // Add location usage descriptions
    config.modResults.NSLocationAlwaysUsageDescription = 
      config.modResults.NSLocationAlwaysUsageDescription || 
      'This app monitors spending danger zones in the background to help you avoid regrettable purchases.';
    
    config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription = 
      config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription || 
      'This app monitors spending danger zones in the background to help you avoid regrettable purchases.';
    
    config.modResults.NSLocationWhenInUseUsageDescription = 
      config.modResults.NSLocationWhenInUseUsageDescription || 
      'This app needs your location to monitor spending danger zones and provide smart purchase nudges.';
    
    return config;
  });
  
  // Add the Swift file and CoreML model to Xcode project
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const modulePath = path.join(__dirname, 'ios');
    
    // Add Swift source file
    const swiftFile = 'OnDevicePredictor.swift';
    const swiftPath = path.join(modulePath, swiftFile);
    
    if (fs.existsSync(swiftPath)) {
      xcodeProject.addSourceFile(swiftPath, {}, xcodeProject.getFirstTarget().uuid);
    }
    
    // Add CoreML model
    const mlmodelFile = 'PurchasePredictor.mlmodel';
    const mlmodelPath = path.join(modulePath, mlmodelFile);
    
    if (fs.existsSync(mlmodelPath)) {
      xcodeProject.addResourceFile(mlmodelPath, {}, xcodeProject.getFirstTarget().uuid);
    }
    
    return config;
  });
  
  return config;
}

module.exports = withOnDevicePredictor;
