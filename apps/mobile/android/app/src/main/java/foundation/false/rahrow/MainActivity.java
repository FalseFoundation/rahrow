package foundation.falsefoundation.rahrow;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		registerPlugin(RahRowVpnPlugin.class);
		registerPlugin(RahRowQrPlugin.class);
		registerPlugin(RahRowSubscriptionPlugin.class);
		registerPlugin(RahRowNetworkPlugin.class);
		super.onCreate(savedInstanceState);
	}
}
