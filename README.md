---
---
topic: sample
languages:
 - nodejs
products:
 - azure-sdks
services: Azure-Stack
platforms: nodejs
author: microsoft
------

# Getting Started with Azure Storage Resource Provider in Node.js

This sample shows how to manage your storage account using the Azure stack or Azure Storage Resource Provider for Node.js. The Storage Resource Provider is a client library for working with the storage accounts in your Azure subscription. Using the client library, you can create a new storage account, read its properties, list all storage accounts in a given subscription or resource group, read and regenerate the storage account keys, and delete a storage account.  

**On this page**

- Run this sample
- What is index.js doing?

## Run this sample

To run this sample:

1. If you don't already have it, get [node.js](https://nodejs.org).

2. Clone the repository.

		git clone https://github.com:Azure-Samples/hybrid-storage-nodejs-create-storageaccount.git


3. Install the dependencies.

	    cd hybrid-storage-nodejs-create-storageaccount
	    npm install

4. Create an Azure service principal, using 
    [Azure CLI](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal-cli/),
    [PowerShell](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal/)
    or [Azure Portal](https://azure.microsoft.com/documentation/articles/resource-group-create-service-principal-portal/).

5. Set the following environment variables using the information from the service principal that you created.

	    export SUBSCRIPION_ID={your subscription id}
	    export AZURE_CLIENT_ID={your client id}
	    export AZURE_CLIENT_SECRET={your client secret}
	    export AZURE_TENANT_ID={your tenant id as a guid OR the domain name of your org <contosocorp.com>}
	    export ARM_ENDPOINT={your client id}
        export AZURE_LOCATION={your azurestack environment region/location}

    > [AZURE.NOTE] On Windows, use `set` instead of `export`.

6. Run the sample.

	    node index.js

7. To clean up after index.js, run the cleanup script.

    	node cleanup.js <resourceGroupName> <storageAccountName>

## What does index.js do?

The sample creates a new storage account, lists the storage accounts in the subscription or resource group, lists the storage account keys, regenerates the storage account keys, gets the storage account properties, updates the storage account SKU, and checks storage account name availability.

The sample starts by logging in using your service principal and creating ResourceManagementClient and StorageManagementClient objects using your credentials and subscription ID.

	_validateEnvironmentVariables();
	var clientId = process.env['AZURE_CLIENT_ID'];
	var domain = process.env['AZURE_TENANT_ID'];
	var secret = process.env['AZURE_CLIENT_SECRET'];
	var subscriptionId = process.env['SUBSCRIPTION_ID'];
    var location = process.env['AZURE_LOCATION'];
	var resourceClient, webSiteClient;
	//Sample Config
	var randomIds = {};
	var location = 'westus';
	var resourceGroupName = _generateRandomId('testrg', randomIds);
	var hostingPlanName = _generateRandomId('plan', randomIds);
	var webSiteName = _generateRandomId('testweb', randomIds);
	var expectedServerFarmId;

	  ///////////////////////////////////////////
	 //Entrypoint for the storage-sample script/
	///////////////////////////////////////////
	
	msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain, function (err, credentials) {
	  if (err) return console.log(err);
	  resourceClient = new ResourceManagementClient(credentials, subscriptionId);
	  storageClient = new StorageManagementClient(credentials, subscriptionId);	

The sample then sets up a resource group in which it will create the new storage account.

	function createResourceGroup(callback) {
	  var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
	  console.log('\nCreating resource group: ' + resourceGroupName);
	  return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
	}

### Create a new storage account

Next, the sample creates a new storage account that is associated with the resource group created in the previous step. 

In this case, the storage account name is randomly generated to assure uniqueness. However, the call to create a new storage account will succeed if an account with the same name already exists in the subscription.

	var createParameters = {
		location: location,
		sku: {
	  		name: accType,
		},
		kind: 'Storage',
		tags: {
	  		tag1: 'val1',
	  		tag2: 'val2'
		}
	};
	console.log('\n-->Creating storage account: ' + storageAccountName + ' with parameters:\n' + util.inspect(createParameters));
	return storageClient.storageAccounts.create(resourceGroupName, storageAccountName, createParameters, callback);

### List storage accounts in the subscription or resource group

The sample lists all of the storage accounts in a given subscription: 

	console.log('\n-->Listing storage accounts in the current subscription.');
	return storageClient.storageAccounts.list(callback);


It also lists storage accounts in the resource group:

	console.log('\n-->Listing storage accounts in the resourceGroup : ' + resourceGroupName);
	return storageClient.storageAccounts.listByResourceGroup(resourceGroupName, callback);

### Read and regenerate storage account keys

The sample lists storage account keys for the newly created storage account and resource group:

	console.log('\n-->Listing storage account keys for account: ' + storageAccountName);
	return storageClient.storageAccounts.listKeys(resourceGroupName, storageAccountName, callback);

It also regenerates the account access keys:

	console.log('\n-->Regenerating storage account keys for account: ' + storageAccountName);
	return storageClient.storageAccounts.regenerateKey(resourceGroupName, storageAccountName, 'key1', callback);

### Get storage account properties

The sample reads the storage account's properties:

	console.log('\n-->Getting info of storage account: ' + storageAccountName);
	return storageClient.storageAccounts.getProperties(resourceGroupName, storageAccountName, callback);

### Modify the storage account SKU

The storage account SKU specifies what type of replication applies to the storage account. You can update the storage account SKU to change how the storage account is replicated, as shown in the sample:

	var updateParameters = {
		sku: {
	  		name: 'Standard_GRS'
		}
	};
	console.log('\n-->Updating storage account : ' + storageAccountName + ' with parameters:\n' + util.inspect(updateParameters));
	return storageClient.storageAccounts.update(resourceGroupName, storageAccountName, updateParameters, callback);

Note that modifying the SKU for a production storage account may have associated costs. For example, if you convert a locally redundant storage account to a geo-redundant storage account, you will be charged for replicating your data to the secondary region. Before you modify the SKU for a production account, be sure to consider any cost implications. See [Azure Storage replication](https://azure.microsoft.com/documentation/articles/storage-redundancy/) for additional information about storage replication.

### Check storage account name availability

The sample checks whether a given storage account name is available in Azure: 

	console.log('\n-->Checking if the storage account name : ' + storageAccountName + ' is available.');
	return storageClient.storageAccounts.checkNameAvailability(storageAccountName, callback);

### Delete the storage account and resource group

Running cleanup.js deletes the storage account that the sample created:

	console.log('\nDeleting storage account : ' + storageAccountName);
	return storageClient.storageAccounts.deleteMethod(resourceGroupName, storageAccountName, callback);

It also deletes the resource group that the sample created:

	console.log('\nDeleting resource group: ' + resourceGroupName);
	return resourceClient.resourceGroups.deleteMethod(resourceGroupName, callback);


## More information

- [Azure SDK for Node.js](https://github.com/Azure/azure-sdk-for-node) 
- [Azure Storage Documentation](https://azure.microsoft.com/services/storage/)