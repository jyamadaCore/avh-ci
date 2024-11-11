describe('Automate Corellium Cafe Order', () => {
    it('should place an order', async () => {
        const el2 = await driver.$("id:com.corellium.cafe:id/guestButton");
        await el2.click();

        const el3 = await driver.$("-android uiautomator:new UiSelector().text(\"Cup of Coffee\")");
        await el3.click();

        const el4 = await driver.$("id:com.corellium.cafe:id/fbAdd");
        await el4.click();

        const el5 = await driver.$("accessibility id:Cart");
        await el5.click();

        const el6 = await driver.$("id:com.corellium.cafe:id/tvCheckout");
        await el6.click();

        const el7 = await driver.$("id:com.corellium.cafe:id/firstnameEditText");
        await el7.addValue("Tester");

        const el8 = await driver.$("id:com.corellium.cafe:id/lastnameEditText");
        await el8.addValue("Tester");

        const el9 = await driver.$("id:com.corellium.cafe:id/phoneEditText");
        await el9.addValue("1234567891");

        const el10 = await driver.$("id:com.corellium.cafe:id/submitButton");
        await el10.click();

        const el11 = await driver.$("id:com.corellium.cafe:id/etCCNumber");
        await el11.addValue("123456789101112");

        const el12 = await driver.$("id:com.corellium.cafe:id/etExpiration");
        await el12.addValue("1223");

        const el13 = await driver.$("id:com.corellium.cafe:id/etCVV");
        await el13.addValue("123");

        const el14 = await driver.$("id:com.corellium.cafe:id/etPostalCode");
        await el14.addValue("12345");

        const el15 = await driver.$("id:com.corellium.cafe:id/bvReviewOrder");
        await el15.click();

        const el16 = await driver.$("id:com.corellium.cafe:id/bvSubmitOrder");
        await el16.click();

        const el17 = await driver.$("id:android:id/button1");
        await el17.click();
    });
});
