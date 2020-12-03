/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
'use strict';

var Environment = require("@azure/ms-rest-azure-env");
var util = require('util');
var async = require('async');
var msRestAzure = require('@azure/ms-rest-nodeauth');
var ResourceManagementClient = require('@azure/arm-resources-profile-2020-09-01-hybrid').ResourceManagementClient;
var StorageManagementClient = require('@azure/arm-storage-profile-2020-09-01-hybrid').StorageManagementClient;
const request = require('request');
_validateEnvironmentVariables();
_validateParameters();

var clientId = process.env['AZURE_CLIENT_ID'];
var tenantId = process.env['AZURE_TENANT_ID'];
var secret = process.env['AZURE_CLIENT_SECRET'];
var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
var base_url = process.env['ARM_ENDPOINT'];
var resourceGroupName = process.argv[2];
var storageAccountName = process.argv[3];
var resourceClient, storageClient;

var map = {};
const fetchUrl = base_url + 'metadata/endpoints?api-version=1.0'

function deleteStorageAccount(callback) {
  console.log('\nDeleting storage account : ' + storageAccountName);
  return storageClient.storageAccounts.deleteMethod(resourceGroupName, storageAccountName, callback);
}

function deleteResourceGroup(callback) {
  console.log('\nDeleting resource group: ' + resourceGroupName);
  return resourceClient.resourceGroups.deleteMethod(resourceGroupName, callback);
}

function _validateEnvironmentVariables() {
  var envs = [];
  if (!process.env['AZURE_CLIENT_ID']) envs.push('AZURE_CLIENT_ID');
  if (!process.env['AZURE_TENANT_ID']) envs.push('AZURE_TENANT_ID');
  if (!process.env['ARM_ENDPOINT']) envs.push('ARM_ENDPOINT');
  if (!process.env['AZURE_CLIENT_SECRET']) envs.push('AZURE_CLIENT_SECRET');
  if (!process.env['AZURE_SUBSCRIPTION_ID']) envs.push('AZURE_SUBSCRIPTION_ID');
  if (envs.length > 0) {
    throw new Error(util.format('please set/export the following environment variables: %s', envs.toString()));
  }
}

function _validateParameters() {
  if (!process.argv[2] || !process.argv[3]) {
    throw new Error('Please provide the resource group and the storage account name by executing the script as follows: "node cleanup.js <resourceGroupName> <storageAccountName>".');
  }
}

function fetchEndpointMetadata() {
  // Setting URL and headers for request
  var options = {
    url: fetchUrl,
    headers: {
      'User-Agent': 'request'
    },
    rejectUnauthorized: false
  };
  // Return new promise 
  return new Promise(function (resolve, reject) {
    // Do async job
    request.get(options, function (err, resp, body) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(body));
      }
    })
  })
}

function main() {
  var endpointData = fetchEndpointMetadata();
  endpointData.then(function (result) {
    var metadata = result;
    console.log("Initialized user details");
    // Use user details from here
    console.log(metadata)
    map["name"] = "AzureStack"
    map["portalUrl"] = metadata.portalEndpoint 
    map["resourceManagerEndpointUrl"] = base_url 
    map["galleryEndpointUrl"] = metadata.galleryEndpoint 
    map["activeDirectoryEndpointUrl"] = metadata.authentication.loginEndpoint.slice(0, metadata.authentication.loginEndpoint.lastIndexOf("/") + 1) 
    map["activeDirectoryResourceId"] = metadata.authentication.audiences[0] 
    map["activeDirectoryGraphResourceId"] = metadata.graphEndpoint 
    map["storageEndpointSuffix"] = "." + base_url.substring(base_url.indexOf('.'))  
    map["keyVaultDnsSuffix"] = ".vault" + base_url.substring(base_url.indexOf('.')) 
    map["managementEndpointUrl"] = metadata.authentication.audiences[0] 
    var isAdfs = metadata.authentication.loginEndpoint.endsWith('adfs')
    Environment.Environment.add(map);

    var tokenAudience = map["activeDirectoryResourceId"]

    var options = {};
    options["environment"] = Environment.Environment.AzureStack;
    options["tokenAudience"] = tokenAudience;

    if(isAdfs) {
        tenantId = "adfs"
        options.environment.validateAuthority = false
        map["validateAuthority"] = false
    }
    msRestAzure.loginWithServicePrincipalSecret(clientId, secret, tenantId, options, function (err, credentials) {
      if (err) return console.log(err);

      var clientOptions = {};
      clientOptions["baseUri"] = base_url;
      resourceClient = new ResourceManagementClient(credentials, subscriptionId, clientOptions);
      storageClient = new StorageManagementClient(credentials, subscriptionId, clientOptions);

      async.series([
        function (callback) {
          deleteStorageAccount(function (err, result) {
            if (err) return console.log('Error occured in deleting the storage account: ' + storageAccountName + '\n' + util.inspect(err, { depth: null }));
            console.log('Successfully deleted the storage account: ' + storageAccountName);
            console.log('\nDeleting the resource group can take few minutes, so please be patient :).');
            deleteResourceGroup(function (err, result) {
              if (err) return console.log('Error occured in deleting the resource group: ' + resourceGroupName + '\n' + util.inspect(err, { depth: null }));
              console.log('Successfully deleted the resourcegroup: ' + resourceGroupName);
            });
          });
        }
      ],
        // Once above operations finish, cleanup and exit.
        function (err, results) {
          if (err) {
            console.log(util.format('\n??????Error occurred in one of the operations.\n%s',
              util.inspect(err, { depth: null })));
          }
          console.log('\n###### Exit ######\n')
          console.log(util.format('Please execute the following script for cleanup:\nnode cleanup.js %s %s', resourceGroupName, storageAccountName));
          process.exit();
        });
    });
  }, function (err) {
    console.log(err);
  })
}

main();