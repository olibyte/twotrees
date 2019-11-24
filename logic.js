'use strict';
/**
 * Pesticide reading transaction
 * @param {org.twotrees.safety.PesticidesReading} pesticideReading
 * @transaction
 */
async function pesticideReading(pesticideReading) {  

    const cultivation = pesticideReading.cultivation;
    const pesticide = pesticideReading.pesticideType;

    console.log('Adding pesticide reading ' + pesticide + ' to cultivation ' + cultivation.$identifier);

    if(cultivation.pesticideReadings)
        cultivation.pesticideReadings.push(pesticide);
    else
        cultivation.pesticideReadings = [pesticide];

    const cultivationRegistry = await getAssetRegistry('org.twotrees.safety.Cultivation');
    await cultivationRegistry.update(cultivation);
}

/**
 * Soil reading transaction
 * @param {org.twotrees.safety.SoilReading} soilReading
 * @transaction
 */
async function soilReading(soilReading) {  

    const cultivation = soilReading.cultivation;
    const contaminant = soilReading.soilContaminant;

    console.log('Adding soil reading ' + contaminant + ' to cultivation ' + cultivation.$identifier);

    if(cultivation.soilReadings)
        cultivation.soilReadings.push(contaminant);
    else
        cultivation.soilReadings = [contaminant];

    const cultivationRegistry = await getAssetRegistry('org.twotrees.safety.Cultivation');
    await cultivationRegistry.update(cultivation);
}

/**
 * Acidity reading transaction
 * @param {org.twotrees.safety.AcidityReading} acidityReading
 * @transaction
 */
async function acidityReading(acidityReading) {  
    const production = acidityReading.production;
    const acidity = acidityReading.acidityPercentage;
  
  	console.log('Adding acidity reading ' + acidity + ' to production ' + production.productionId);
  
  if(production.acidityReadings)
    production.acidityReadings.push(acidity);
  else
    production.acidityReadings = [acidity];
  
  const productionRegistry = await getAssetRegistry('org.twotrees.safety.Production');
  await productionRegistry.update(production);
}

/**
 * Determine Grade transaction
 * @param {org.twotrees.safety.Bottling} bottling
 * @transaction
 */
async function determineGrade(bottling) {
    const cultivation = bottling.cultivation;
    const production = bottling.production;

    const soilReadingSet = new Set(cultivation.soilReadings);
    const pesticideReadingSet = new Set(cultivation.pesticideReadings);
    let oilTypeVal = '';

    if(!soilReadingSet.has('NONE') || soilReadingSet.size > 1) {
        oilTypeVal = 'REJECTED';
    }
    else {
        // determine if it is organic
        if(!pesticideReadingSet.has('CHEMICALS'))
            oilTypeVal = 'ORGANIC_';
        
        const largestAcidityReading = Math.max.apply(Math, production.acidityReadings);

        if(largestAcidityReading <= 1) {
            oilTypeVal += 'DELICATE_EXTRA_VIRGIN';
        }
        else if (largestAcidityReading <= 2 && largestAcidityReading > 1) {
            oilTypeVal += 'EXTRA_VIRGIN';
        }
        else if (largestAcidityReading <= 4 && largestAcidityReading > 2) {
            oilTypeVal += 'VIRGIN';
        }
        else {
            oilTypeVal = 'BEAUTY';
        }
    }
    
    console.log('Determined oil type ' + oilTypeVal + ' for production ' + production.productionId);

    let id = production.productionId;
    id = id.replace('OIL_BATCH_','');
    console.log('errors: '+id);

    const factory = getFactory();
    const NS = 'org.twotrees.safety';
    const grade = factory.newResource(NS, 'Grade', 'OIL_GRADE_'+id);
    grade.bottledDate = bottling.timestamp;
    grade.oilGrade = oilTypeVal;
    grade.bottler = factory.newRelationship(NS, 'Bottler', 'bottler@twotrees');

    // add the grade
    const gradeRegistry = await getAssetRegistry(NS + '.Grade');
    await gradeRegistry.addAll([grade]);
}

/**
 * Initialize some test assets and participants useful for running a demo.
 * @param {org.twotrees.safety.SetupDemo} setupDemo - the SetupDemo transaction
 * @transaction
 */
async function setup(setupDemo) {  // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const NS = 'org.twotrees.safety';

    // create the grower
    const grower = factory.newResource(NS, 'OliveGrowers', 'olivefarmer@twotrees.com');
    const growerAddress = factory.newConcept(NS, 'Address');
    growerAddress.country = 'Italy';
    grower.address = growerAddress;

    // create the producer
    const producer = factory.newResource(NS, 'OilProducer', 'producer@twotrees.com');
    const producerAddress = factory.newConcept(NS, 'Address');
    producerAddress.country = 'US';
    producer.address = producerAddress;

    // create the bottler
    const bottler = factory.newResource(NS, 'Bottler', 'bottler@twotrees.com');
    const bottlerAddress = factory.newConcept(NS, 'Address');
    bottlerAddress.country = 'US';
    bottler.address = bottlerAddress;

    const yesterday = setupDemo.timestamp;
    yesterday.setDate(yesterday.getDate() -1);

    const today = setupDemo.timestamp;
    today.setDate(today.getDate());
    
    // create first cultivation
    const crop = factory.newResource(NS, 'Cultivation', 'OLIVE_BATCH_001');
    crop.process = 'HANDPICKED';
    crop.pesticideType = 'NATURAL_TOXINS';
    crop.grower = factory.newRelationship(NS, 'OliveGrowers', 'olivefarmer@twotrees.com');    
    crop.pickingDate = yesterday;
    const cultivationAddress = factory.newConcept(NS, 'Address');
    cultivationAddress.country = 'Italy';
    crop.originAddress = cultivationAddress;
      
    // create the oil production
    const oilbatch = factory.newResource(NS, 'Production', 'OIL_BATCH_001');
    oilbatch.method = 'COLD_EXTRACTION';
    oilbatch.crushingDate = today;
    oilbatch.storedDate = today;
    oilbatch.producer = factory.newRelationship(NS, 'OilProducer', 'producer@twotrees.com');

    // add the growers
    const growerRegistry = await getParticipantRegistry(NS + '.OliveGrowers');
    await growerRegistry.addAll([grower]);

    // add the producers
    const producerRegistry = await getParticipantRegistry(NS + '.OilProducer');
    await producerRegistry.addAll([producer]);

    // add the bottlers
    const bottlerRegistry = await getParticipantRegistry(NS + '.Bottler');
    await bottlerRegistry.addAll([bottler]);

    // add the crops
    const cropsRegistry = await getAssetRegistry(NS + '.Cultivation');
    await cropsRegistry.addAll([crop]);

    // add the production
    const oilbatchRegistry = await getAssetRegistry(NS + '.Production');
    await oilbatchRegistry.addAll([oilbatch]);
}
