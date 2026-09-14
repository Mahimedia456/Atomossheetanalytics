import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
export default function MetricCard({label,value,accent=colors.primary}:{label:string;value:string|number;accent?:string}) {
  return <View style={styles.card}><View style={[styles.line,{backgroundColor:accent}]}/><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}
const styles=StyleSheet.create({card:{flex:1,minWidth:145,borderWidth:1,borderColor:colors.border,borderRadius:18,backgroundColor:colors.surface,padding:15,overflow:"hidden"},line:{position:"absolute",left:0,top:0,bottom:0,width:3},label:{color:colors.textDim,fontSize:9,fontWeight:"900",letterSpacing:1.1,textTransform:"uppercase"},value:{color:colors.text,fontSize:25,fontWeight:"900",marginTop:7}});
